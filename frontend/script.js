// DOM Elements
const authContainer = document.getElementById('auth-container');
const authOptions = document.getElementById('auth-options');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const submitLogin = document.getElementById('submit-login');
const submitRegister = document.getElementById('submit-register');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const mainInterface = document.getElementById('main-interface');
const currentUserDisplay = document.getElementById('current-user');
const usernameSpan = document.querySelector('.username');
const rollSpan = document.querySelector('.roll');
const logoutBtn = document.getElementById('logout-btn');
const privateChatBtn = document.getElementById('private-message');
const userListContainer = document.getElementById('user-list');
const privateChatInterface = document.getElementById('private-chat-interface');
const privateChatBox = document.getElementById('private-chat-box');
const privateChatInput = document.getElementById('private-chat-input');
const privateSendBtn = document.getElementById('private-send-message');
const privateChatTitle = document.getElementById('private-chat-title');
const closePrivateChat = document.getElementById('close-private-chat');
// Chat Interface Elements
const joinClientBtn = document.getElementById('join-client');
const createRoomBtn = document.getElementById('create-room');
const clientForm = document.getElementById('client-form');
const roomForm = document.getElementById('room-form');
const roomSelection = document.getElementById('room-selection');
const usernameInput = document.getElementById('username');
const roomNameInput = document.getElementById('room-name');
const submitUsernameBtn = document.getElementById('submit-username');
const submitRoomBtn = document.getElementById('submit-room');
const roomListContainer = document.getElementById('room-list-container');
const noRoomsMessage = document.getElementById('no-rooms-message');
const chatInterface = document.getElementById('chat-interface');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendMessageBtn = document.getElementById('send-message');
const leaveRoomBtn = document.getElementById('leave-room');
const roomTitle = document.getElementById('current-room-name');

// Application State
let currentUser = null;
let socket = null;
let currentRoomId = null;
let isWebSocketSetup = false;
let currentUsername = '';
let roomCreationTimeout = null;

// Event Listeners
loginBtn.addEventListener('click', showLoginForm);
registerBtn.addEventListener('click', showRegisterForm);
submitLogin.addEventListener('click', handleLogin);
submitRegister.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
joinClientBtn.addEventListener('click', showClientForm);
createRoomBtn.addEventListener('click', showRoomForm);
submitUsernameBtn.addEventListener('click', handleClientJoin);
submitRoomBtn.addEventListener('click', handleRoomCreation);
sendMessageBtn.addEventListener('click', sendMessage);
leaveRoomBtn.addEventListener('click', leaveRoom);
privateChatBtn.addEventListener('click', showUserList);
privateSendBtn.addEventListener('click', sendPrivateMessage);
closePrivateChat.addEventListener('click', closePrivateChat);
chatInput.addEventListener('keydown', handleChatInputKeyPress);
privateChatInput.addEventListener('keydown', handlePrivateChatInputKeyPress);


function handleChatInputKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (chatInput.value.trim()) {  
            sendMessage();
        }
    }
}

function handlePrivateChatInputKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (privateChatInput.value.trim()) {
            sendPrivateMessage();
        }
    }
}


init();

// ===== Authentication Functions =====
function showLoginForm() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    clearMessages();
}

function showRegisterForm() {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    clearMessages();
}

function clearMessages() {
    loginMessage.textContent = '';
    registerMessage.textContent = '';
}

async function handleLogin() {
    const roll = document.getElementById('login-roll').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    if (!/^23pd(0[1-9]|[12][0-9]|3[0-9]|40)$/.test(roll)) {
        showMessage(loginMessage, 'Invalid roll number format. Must be like 23pd01 to 23pd40', 'error');
        return;
    }

    try {
        const user = await authenticateUser(roll, password);
        currentUser = {
            roll: user.roll,
            name: user.name,
            token: user.token
        };
        showMainInterface();
        updateUserDisplay();
        initializeChatConnection();
    } catch (error) {
        showMessage(loginMessage, error.message, 'error');
    }
}

async function handleRegister() {
    const roll = document.getElementById('register-roll').value.trim().toLowerCase();
    const name = document.getElementById('register-name').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    if (!/^23pd(0[1-9]|[12][0-9]|3[0-9]|40)$/.test(roll)) {
        showMessage(registerMessage, 'Invalid roll number format. Must be like 23pd01 to 23pd40', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage(registerMessage, 'Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage(registerMessage, 'Password must be at least 6 characters', 'error');
        return;
    }

    try {
        await registerUser(roll, name, password);
        showMessage(registerMessage, 'Registration successful! Please login.', 'success');
        document.getElementById('register-roll').value = '';
        document.getElementById('register-name').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        setTimeout(() => showLoginForm(), 1500);
    } catch (error) {
        showMessage(registerMessage, error.message, 'error');
    }
}

function updateUserDisplay() {
    if (currentUser) {
        usernameSpan.textContent = currentUser.name;
        rollSpan.textContent = `(${currentUser.roll})`;
    }
}

function showMainInterface() {
    authContainer.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    resetChatInterface();
}

function handleLogout() {
    currentUser = null;
    currentRoomId = null;
    if (socket) {
        socket.close();
        socket = null;
    }
    mainInterface.classList.add('hidden');
    authContainer.classList.remove('hidden');
    showLoginForm();
}
function showUserList() {
    socket.send(JSON.stringify({ type: 'getUsers' }));
}
function sendPrivateMessage() {
    const message = privateChatInput.value.trim();
    if (!message || !currentPrivateRecipient) return;
    
    socket.send(JSON.stringify({
        type: 'privateMessage',
        recipient: currentPrivateRecipient,
        content: message
    }));
    
    appendPrivateMessage({
        sender: currentUsername || currentUser.name,
        content: message,
        timestamp: new Date().toISOString(),
        isCurrentUser: true
    });
    
    privateChatInput.value = '';
    privateChatInput.focus();
}
function appendPrivateMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.isCurrentUser ? 'sent' : 'received'}`;
    
    if (!message.isCurrentUser) {
        messageElement.innerHTML = `
            <div class="message-sender">${message.sender} (${message.senderRoll || ''})</div>
            <div class="message-content">
                <p>${message.content}</p>
            </div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        `;
    } else {
        messageElement.innerHTML = `
            <div class="message-content">
                <p>${message.content}</p>
            </div>
            <div class="message-time">${formatTime(message.timestamp)}</div>
        `;
    }
    privateChatBox.appendChild(messageElement);
    privateChatBox.scrollTop = privateChatBox.scrollHeight;
}
// ===== Chat Interface Functions =====
function showClientForm() {
    clientForm.classList.remove('hidden');
    roomForm.classList.add('hidden');
    roomSelection.classList.add('hidden');
    chatInterface.classList.add('hidden');
    usernameInput.value = currentUser.name;
}

function showRoomForm() {
    roomForm.classList.remove('hidden');
    clientForm.classList.add('hidden');
    roomSelection.classList.add('hidden');
    chatInterface.classList.add('hidden');
}

function handleClientJoin() {
    const username = usernameInput.value.trim();
    if (!username) {
        showMessage(clientForm.querySelector('.message'), 'Please enter a display name', 'error');
        return;
    }
    currentUsername = username;
    clientForm.classList.add('hidden');
    roomSelection.classList.remove('hidden');
    fetchRoomList();
}

function handleRoomCreation() {
    const roomName = roomNameInput.value.trim();
    if (!roomName) {
        showMessage(roomForm.querySelector('.message'), 'Please enter a room name', 'error');
        return;
    }

    const originalText = submitRoomBtn.textContent;
    submitRoomBtn.disabled = true;
    submitRoomBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        showError("Not connected to server");
        submitRoomBtn.disabled = false;
        submitRoomBtn.textContent = originalText;
        return;
    }

    socket.send(JSON.stringify({
        type: 'createRoom',
        roomName,
        creator: currentUser.roll
    }));

    
}

function fetchRoomList() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'getRooms' }));
    }
}

function displayRooms(rooms) {
    roomListContainer.innerHTML = '';
    if (!rooms || rooms.length === 0) {
        noRoomsMessage.classList.remove('hidden');
        return;
    }
    noRoomsMessage.classList.add('hidden');
    
    rooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'room-card';
        roomCard.innerHTML = `
            <div class="room-info">
                <h3>${room.name}</h3>
                <p>${room.userCount} user${room.userCount !== 1 ? 's' : ''} ${room.userCount === 0 ? '(empty)' : 'chatting'}</p>
                <p>Created by: ${room.creator}</p>
            </div>
            <button class="join-btn" data-room="${room.name}">
                Join <i class="fas fa-arrow-right"></i>
            </button>
        `;
        roomCard.querySelector('.join-btn').addEventListener('click', () => joinRoom(room.name));
        roomListContainer.appendChild(roomCard);
    });
}

function joinRoom(roomId) {
    currentRoomId = roomId;
    roomSelection.classList.add('hidden');
    chatInterface.classList.remove('hidden');
    roomTitle.textContent = roomId;
    chatBox.innerHTML = '';
    
    socket.send(JSON.stringify({
        type: 'joinRoom',
        roomId,
        username: currentUsername || currentUser.name
    }));
    
    appendMessage({
        text: `Welcome to the ${roomId} room!`,
        type: 'system'
    });
}

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !currentRoomId) return;
    
    socket.send(JSON.stringify({
        type: 'message',
        roomId: currentRoomId,
        username: currentUsername || currentUser.name,
        text: message,
        timestamp: new Date().toISOString()
    }));
    chatInput.value = '';
    chatInput.focus();
}

function leaveRoom() {
    if (!currentRoomId) return;
    
    socket.send(JSON.stringify({
        type: 'leaveRoom',
        roomId: currentRoomId,
        username: currentUsername || currentUser.name
    }));
    
    chatInterface.classList.add('hidden');
    roomSelection.classList.remove('hidden');
    currentRoomId = null;
    appendMessage({
        text: `You left the room`,
        type: 'system'
    });
}

function appendMessage(messageData) {
    const messageElement = document.createElement('div');
    
    if (messageData.type === 'system') {
        messageElement.className = 'message system';
        messageElement.innerHTML = `<p>${messageData.text}</p>`;
    } else {
        const isCurrentUser = messageData.username === (currentUsername || currentUser.name);
        messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        
        if (!isCurrentUser) {
            messageElement.innerHTML = `
                <div class="message-sender">${messageData.username} (${messageData.roll || ''})</div>
                <div class="message-content">
                    <p>${messageData.text}</p>
                </div>
                <div class="message-time">${formatTime(messageData.timestamp)}</div>
            `;
        } else {
            messageElement.innerHTML = `
                <div class="message-content">
                    <p>${messageData.text}</p>
                </div>
                <div class="message-time">${formatTime(messageData.timestamp)}</div>
            `;
        }
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function resetChatInterface() {
    clientForm.classList.add('hidden');
    roomForm.classList.add('hidden');
    roomSelection.classList.add('hidden');
    chatInterface.classList.add('hidden');
    chatBox.innerHTML = '';
    chatInput.value = '';
}

// ===== WebSocket Functions =====
function initializeChatConnection() {
    if (isWebSocketSetup) return;
    
    socket = new WebSocket(`ws://localhost:3000?token=${currentUser.token}`);
    
    socket.onopen = () => {
        isWebSocketSetup = true;
        socket.send(JSON.stringify({
            type: 'register',
            username: currentUsername || currentUser.name,
            roll: currentUser.roll
        }));
        fetchRoomList();
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleSocketMessage(message);
    };

    socket.onclose = () => {
        isWebSocketSetup = false;
        setTimeout(initializeChatConnection, 5000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        showError('Connection error');
    };
}

function handleSocketMessage(message) {
    console.log('Received message:', message);
    
    switch(message.type) {
        case 'roomCreated':
            if (message.success) {
                console.log('Room created successfully:', message.roomName);
                submitRoomBtn.disabled = false;
                submitRoomBtn.innerHTML = 'Create Room';
                
                currentRoomId = message.roomName;
                roomTitle.textContent = message.roomName;
                roomForm.classList.add('hidden');
                chatInterface.classList.remove('hidden');
                
                fetchRoomList();
                
                appendMessage({
                    text: `You created room "${message.roomName}"`,
                    type: 'system'
                });
            } else {
                showError(message.message || 'Failed to create room');
            }
            break; 
            
        case 'roomList':
            displayRooms(message.rooms);
            break;
            
        case 'userJoined':
            if (message.roomName === currentRoomId) {
                appendMessage({
                    text: `${message.username} joined the room`,
                    type: 'system'
                });
            }
            break;
            
        case 'userLeft':
            if (message.roomName === currentRoomId) {
                appendMessage({
                    text: `${message.username} left the room`,
                    type: 'system'
                });
            }
            break;
            
        case 'message':
        case 'messageHistory':
            if (Array.isArray(message.messages)) {
                message.messages.forEach(msg => appendMessage(msg));
            } else {
                appendMessage(message);
            }
            break;
        case 'userList':
            displayUserList(message.users);
            break;
                
        case 'privateMessage':
            if (!privateChatInterface.classList.contains('hidden') && 
                message.sender === currentPrivateRecipient) {
                appendPrivateMessage({
                    ...message,
                    isCurrentUser: false
                });
            } else {
                showNotification(`New message from ${message.sender}`);
            }
            break;
            
            
        case 'error':
            showError(message.message);
            break;
    }
}
function displayUserList(users) {
    userListContainer.innerHTML = '';
    users.forEach(user => {
        if (user.username !== (currentUsername || currentUser.name)) {
            const userElement = document.createElement('li');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <span>${user.username} (${user.roll})</span>
                <button class="start-chat" data-user="${user.username}">
                    <i class="fas fa-comment"></i>
                </button>
            `;
            userElement.querySelector('.start-chat').addEventListener('click', () => {
                startPrivateChat(user.username, user.roll);
            });
            userListContainer.appendChild(userElement);
        }
    });
}

function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'message error';
    errorElement.textContent = message;
    
    (chatInterface.classList.contains('hidden') ? roomSelection : chatBox)
        .appendChild(errorElement);
    
    setTimeout(() => errorElement.remove(), 5000);
}

// ===== User Management Functions =====
function initUserDatabase() {
    if (!localStorage.getItem('chat_users')) {
        const defaultUsers = {
            '23pd01': { roll: '23pd01', name: 'Student 01', password: 'password123', token: 'token1' },
            '23pd02': { roll: '23pd02', name: 'Student 02', password: 'password123', token: 'token2' },
            '23pd25': { roll: '23pd25', name: 'Nigitha', password: 'password123', token: 'token25' }
        };
        localStorage.setItem('chat_users', JSON.stringify(defaultUsers));
    }
}

function getUsers() {
    return JSON.parse(localStorage.getItem('chat_users')) || {};
}

function saveUser(roll, name, password) {
    const users = getUsers();
    if (users[roll]) throw new Error('User already exists!');
    const token = 'token-' + Math.random().toString(36).substr(2, 9);
    users[roll] = { roll, name, password, token };
    localStorage.setItem('chat_users', JSON.stringify(users));
}

async function authenticateUser(roll, password) {
    const users = getUsers();
    const user = users[roll];
    if (!user) throw new Error('User not found!');
    if (user.password !== password) throw new Error('Incorrect password!');
    return { ...user };
}

async function registerUser(roll, name, password) {
    if (!/^23pd(0[1-9]|[12][0-9]|3[0-9]|40)$/.test(roll)) {
        throw new Error('Invalid roll number format!');
    }
    saveUser(roll, name, password);
    return { success: true };
}

// ===== Helper Functions =====
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = 'message ' + type;
}

function init() {
    initUserDatabase();
    const simulatedLoggedInUser = localStorage.getItem('currentUser');
    if (simulatedLoggedInUser) {
        currentUser = JSON.parse(simulatedLoggedInUser);
        showMainInterface();
        updateUserDisplay();
        initializeChatConnection();
    } else {
        showLoginForm();
    }
}