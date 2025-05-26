# Compiler
CC = gcc

# Compiler flags
CFLAGS = -Wall -Wextra -pthread

# Source files (assuming they are in the same directory as the Makefile)
CLIENT_SRC = client.c
MASTER_SERVER_SRC = master_server.c
ROOM_SERVER_SRC = room_server.c

# Executable names
CLIENT_EXE = client
MASTER_SERVER_EXE = master_server
ROOM_SERVER_EXE = room_server

# Default target
all: $(CLIENT_EXE) $(MASTER_SERVER_EXE) $(ROOM_SERVER_EXE)

# Build the client executable
$(CLIENT_EXE): $(CLIENT_SRC)
	$(CC) $(CFLAGS) -o $@ $<

# Build the master server executable
$(MASTER_SERVER_EXE): $(MASTER_SERVER_SRC)
	$(CC) $(CFLAGS) -o $@ $<

# Build the room server executable
$(ROOM_SERVER_EXE): $(ROOM_SERVER_SRC)
	$(CC) $(CFLAGS) -o $@ $<

# Clean up compiled files
clean:
	rm -f $(CLIENT_EXE) $(MASTER_SERVER_EXE) $(ROOM_SERVER_EXE)

# Phony targets
.PHONY: all clean