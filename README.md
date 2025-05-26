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
