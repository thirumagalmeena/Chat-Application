const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

// Serve static files from the "frontend" directory
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Handle root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Store rooms and their client counts
const rooms = new Map();
const clients = new Map(); // Track all connected clients

wss.on('connection', (ws, req) => {
    console.log('New client connected');
    
    // Extract token from URL
    const token = new URLSearchParams(req.url.split('?')[1]).get('token') || '';
    clients.set(ws, {
        token,
        room: null,
        username: null,
        roll: null
    });

    // Send initial room list
    sendRoomList(ws);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message);
        } catch (error) {
            console.error('Error parsing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        const clientData = clients.get(ws);
        if (clientData?.room) {
            handleLeaveRoom(ws, clientData.room);
        }
        clients.delete(ws);
        console.log('Client disconnected');
        broadcastUserList(); // Update user list when someone disconnects
    });
});

function handleMessage(ws, message) {
    const clientData = clients.get(ws);
    
    switch(message.type) {
        case 'register':
            // Store user information
            clientData.username = message.username;
            clientData.roll = message.roll;
            broadcastUserList(); // Update user list when someone registers
            break;
            
        case 'createRoom':
            handleCreateRoom(ws, message.roomName, clientData);
            break;

        case 'joinRoom':
            handleJoinRoom(ws, message.roomId, clientData);
            break;

        case 'message':
            handleChatMessage(ws, message, clientData);
            break;

        case 'leaveRoom':
            handleLeaveRoom(ws, message.roomId);
            break;
            
        case 'getRooms':
            sendRoomList(ws);
            break;
            
        case 'getUsers':
            sendUserList(ws);
            break;
            
        case 'privateMessage':
            handlePrivateMessage(ws, message);
            break;
    }
}

function broadcastUserList() {
    const users = Array.from(clients.values())
        .filter(client => client.username) // Only users who have registered
        .map(client => ({
            username: client.username,
            roll: client.roll,
            status: 'online'
        }));

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'userList',
                users
            }));
        }
    });
}

function sendUserList(ws) {
    const users = Array.from(clients.values())
        .filter(client => client.username)
        .map(client => ({
            username: client.username,
            roll: client.roll,
            status: 'online'
        }));

    ws.send(JSON.stringify({
        type: 'userList',
        users
    }));
}

function handlePrivateMessage(ws, message) {
    const { recipient, content } = message;
    const senderData = clients.get(ws);
    
    if (!senderData.username) {
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'You must be registered to send private messages'
        }));
    }

    // Find recipient's connection
    let recipientFound = false;
    wss.clients.forEach(client => {
        const clientData = clients.get(client);
        if (clientData.username === recipient) {
            recipientFound = true;
            client.send(JSON.stringify({
                type: 'privateMessage',
                sender: senderData.username,
                senderRoll: senderData.roll,
                content,
                timestamp: new Date().toISOString()
            }));
        }
    });

    // Also send to sender for their own chat window
    ws.send(JSON.stringify({
        type: 'privateMessage',
        sender: senderData.username,
        senderRoll: senderData.roll,
        content,
        timestamp: new Date().toISOString(),
        isCurrentUser: true
    }));

    if (!recipientFound) {
        ws.send(JSON.stringify({
            type: 'error',
            message: `User ${recipient} not found or offline`
        }));
    }
}

function handleCreateRoom(ws, roomName, clientData) {
    console.log(`Attempting to create room: ${roomName}`);
    console.log(`Current rooms: ${Array.from(rooms.keys()).join(', ')}`);

    if (!roomName || roomName.length < 3) {
        console.log('Room name too short');
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Room name must be at least 3 characters',
            requestType: 'createRoom'
        }));
    }

    if (rooms.has(roomName)) {
        console.log('Room already exists');
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Room already exists',
            requestType: 'createRoom'
        }));
    }

    // Create new room
    rooms.set(roomName, {
        clients: new Set([ws]),
        creator: clientData.roll,
        createdAt: new Date(),
        messages: []
    });

    // Update client's room
    clientData.room = roomName;

    console.log(`Room "${roomName}" created successfully`);
    
    // Send success response
    ws.send(JSON.stringify({
        type: 'roomCreated',
        roomName,
        success: true,
        creator: clientData.roll,
        timestamp: new Date().toISOString()
    }));

    // Broadcast updated room list
    broadcastRoomList();
}

function handleJoinRoom(ws, roomId, clientData) {
    console.log(`Join room attempt: ${roomId}`); // Debug log
    
    // Enhanced room existence check
    if (!rooms.has(roomId)) {
        console.error(`Room ${roomId} not found`);
        return ws.send(JSON.stringify({
            type: 'error',
            message: `Room "${roomId}" does not exist`,
            requestType: 'joinRoom'
        }));
    }

    const room = rooms.get(roomId);
    
    // Additional safety check
    if (!room || !room.clients) {
        console.error(`Room ${roomId} data corrupted`);
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Room data is invalid',
            requestType: 'joinRoom'
        }));
    }

    // Leave current room if any
    if (clientData.room) {
        handleLeaveRoom(ws, clientData.room);
    }

    try {
        // Join new room
        room.clients.add(ws);
        clientData.room = roomId;

        // Notify all room members
        const joinNotification = {
            type: 'userJoined',
            username: clientData.username,
            roomId,
            timestamp: new Date().toISOString()
        };

        room.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(joinNotification));
            }
        });

        // Send room history
        ws.send(JSON.stringify({
            type: 'messageHistory',
            messages: room.messages.length > 0 ? room.messages : [{
                text: `Welcome to ${roomId}, ${clientData.username}!`,
                type: 'system',
                timestamp: new Date().toISOString()
            }]
        }));

        console.log(`${clientData.username} joined ${roomId}`); // Debug log
    } catch (err) {
        console.error('Join room error:', err);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to join room',
            requestType: 'joinRoom'
        }));
    }
}

function handleChatMessage(ws, message, clientData) {
    if (!clientData.room) return;

    const room = rooms.get(clientData.room);
    if (!room) return;

    const fullMessage = {
        type: 'message',
        username: clientData.username,
        roll: clientData.roll,
        text: message.text,
        timestamp: new Date().toISOString()
    };

    // Store message in room history
    room.messages.push(fullMessage);
    
    // Keep only the last 100 messages
    if (room.messages.length > 100) {
        room.messages.shift();
    }

    // Broadcast to all room members
    room.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(fullMessage));
        }
    });
}

function handleLeaveRoom(ws, roomId) {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const clientData = clients.get(ws);

    room.clients.delete(ws);
    clientData.room = null;

    // Notify remaining users
    room.clients.forEach(client => {
        client.send(JSON.stringify({
            type: 'userLeft',
            username: clientData.username,
            roomId
        }));
    });
    broadcastRoomList();
}

function sendRoomList(ws) {
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
        name: id,
        userCount: room.clients.size,
        creator: room.creator
    }));

    ws.send(JSON.stringify({
        type: 'roomList',
        rooms: roomList
    }));
}

function broadcastRoomList() {
    const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
        name: id,
        userCount: room.clients.size,
        creator: room.creator
    }));

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'roomList',
                rooms: roomList
            }));
        }
    });
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

const fs = require('fs');
const ROOMS_FILE = 'rooms.json';

// Load rooms from file on server start
function loadRooms() {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            const data = fs.readFileSync(ROOMS_FILE, 'utf8');
            const roomsData = JSON.parse(data);
            
            roomsData.forEach(([id, roomData]) => {
                rooms.set(id, {
                    ...roomData,
                    clients: new Set() // Initialize empty clients set
                });
            });
            console.log(`Loaded ${rooms.size} rooms from file`);
        }
    } catch (err) {
        console.error('Error loading rooms:', err);
    }
}

// Save rooms to file periodically
function saveRooms() {
    try {
        const roomsData = Array.from(rooms.entries()).map(([id, room]) => {
            return [id, {
                creator: room.creator,
                createdAt: room.createdAt,
                messages: room.messages
            }];
        });
        
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData));
        console.log(`Saved ${rooms.size} rooms to file`);
    } catch (err) {
        console.error('Error saving rooms:', err);
    }
}

// Call this at server startup
loadRooms();

// Save rooms every 10 seconds
setInterval(saveRooms, 10000);