# College Classroom Chat Application

## Overview
A real-time chat application exclusively for Data Science students (23PD01-23PD40) with:
- Secure authentication
- Multi-room chat functionality
- Real-time messaging

## Features

### User Authentication
**Secure Login**  
- Roll number + password authentication
- New user registration
- Exclusive to 23PD01-23PD40 students

### Chat Room Management
**Room Controls**  
- Create rooms (Max 10)
- Join existing rooms
- View room stats (name, online count)
- Capacity: 40 users/room

### Technical Stack
**Implementation**  
| Component | Technology |
|-----------|------------|
| Backend   | C          |
| Frontend  | HTML/CSS   |
| Realtime  | JavaScript |

## System Requirements

### Server Side
- Linux/Unix OS
- GCC compiler
- POSIX threads library
- Basic networking support

### Client Side
- Chrome/Firefox/Edge
- JavaScript enabled
- Stable internet connection

## Installation

### Server Setup
1. Compile the server:
```bash
gcc master_server.c -o master_server -lpthread
gcc room_server.c -o room_server -lpthread
gcc client.c -o client -lpthread
```
2. Frontend
- Open the frontend/index.html file in your browser.
- Make sure the frontend connects to the correct server IP and port.

# Client Setup

- Open `index.html` in your web browser.
- The application should connect automatically to the running server.

---

# Usage Guide

## Registration

- First-time users should register with their **college roll number**.
- Choose a **secure password**.

## Login

- Enter your **registered roll number** and **password**.
- You'll be redirected to the **chat room lobby**.

## Chat Rooms

- **To create a room:** Click "Create Room" and enter a name.
- **To join a room:** Select from available rooms and click "Join".
- **Active users count** is displayed for each room.

---

# Limitations

- A maximum of **10 chat rooms** can exist simultaneously.
- Each room supports up to **40 concurrent users**.
- Only students with roll numbers **23PD01 to 23PD40** can register.

---

# Security Notes

- Passwords are stored securely (**hashed**) on the server.
- Communication is **not encrypted** (consider using **HTTPS** in production).
- Room creation is **unrestricted** but limited in **quantity**.

---

# Troubleshooting

- If connection fails, verify the **server is running**.
- **Refresh the page** if the interface becomes unresponsive.
- **Clear browser cache** if experiencing display issues.

---

# License
- This project is licensed for educational purposes only.

---

## Contributors

**Thirumagal Meena A**  
Applied Mathematics and Computational Sciences  
Psg College of Technology  

**Pon Nigitha G**  
Applied Mathematics and Computational Sciences  
Psg College of Technology
