#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <arpa/inet.h>
#include <time.h>

#define BUFFER_SIZE 1024
#define MAX_CLIENTS 40
#define MASTER_IP "127.0.0.1"
#define MASTER_PORT 8080

typedef struct {
    int socket;
    char username[32];
} Client;

Client clients[MAX_CLIENTS];
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
int room_port;
FILE *chat_history_file;
int client_count = 0;

// Open chat history file
void open_chat_history() {
    char filename[64];
    snprintf(filename, sizeof(filename), "chat_history_%d.txt", room_port);
    chat_history_file = fopen(filename, "a");
    if (chat_history_file == NULL) {
        perror("Failed to open chat history file");
        exit(1);
    }
}

// Write message to chat history file
void write_to_chat_history(const char *message) {
    pthread_mutex_lock(&lock);
    fprintf(chat_history_file, "%s", message);
    fflush(chat_history_file);
    pthread_mutex_unlock(&lock);
}

// Broadcast messages to all clients except the sender
void broadcast_message(const char *message, int sender_sock) {
    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (clients[i].socket != 0 && clients[i].socket != sender_sock) {
            send(clients[i].socket, message, strlen(message), 0);
        }
    }
    pthread_mutex_unlock(&lock);

    // Display message in room server terminal
    printf("%s", message);

    // Save message to chat history file
    write_to_chat_history(message);
}

// Update client count on master server
void update_client_count(int count) {
    int sock;
    struct sockaddr_in master_addr;

    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("Socket creation failed");
        return;
    }

    master_addr.sin_family = AF_INET;
    master_addr.sin_port = htons(MASTER_PORT);
    inet_pton(AF_INET, MASTER_IP, &master_addr.sin_addr);

    if (connect(sock, (struct sockaddr*)&master_addr, sizeof(master_addr)) < 0) {
        perror("Connection to master server failed");
        close(sock);
        return;
    }

    char update_command[32];
    snprintf(update_command, sizeof(update_command), "/update %d %d", room_port, count);
    send(sock, update_command, strlen(update_command), 0);
    close(sock);
}

// Handle client communication
void *handle_client(void *arg) {
    int client_sock = *(int *)arg;
    char buffer[BUFFER_SIZE];
    char username[32];

    // Receive username
    int bytes_received = recv(client_sock, username, sizeof(username) - 1, 0);
    if (bytes_received <= 0) {
        close(client_sock);
        free(arg);
        return NULL;
    }
    username[bytes_received] = '\0';

    // Store client
    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (clients[i].socket == 0) {
            clients[i].socket = client_sock;
            strncpy(clients[i].username, username, sizeof(username) - 1);
            client_count++;
            break;
        }
    }
    pthread_mutex_unlock(&lock);

    // Update client count on master server
    update_client_count(client_count);

    // Notify all clients
    char join_message[BUFFER_SIZE];
    snprintf(join_message, sizeof(join_message), "[SERVER] %s has joined the chat.\n", username);
    broadcast_message(join_message, client_sock);

    // Handle messages
    while (1) {
        memset(buffer, 0, BUFFER_SIZE);
        bytes_received = recv(client_sock, buffer, BUFFER_SIZE - 1, 0);
        if (bytes_received <= 0) {
            break;
        }
        buffer[bytes_received] = '\0';

        if (strcmp(buffer, "/exit_room") == 0) {
            // Notify all clients
            snprintf(join_message, sizeof(join_message), "[SERVER] %s has left the chat room.\n", username);
            broadcast_message(join_message, client_sock);
            break;
        } else if (strcmp(buffer, "/exit") == 0) {
            // Notify all clients
            snprintf(join_message, sizeof(join_message), "[SERVER] %s has disconnected.\n", username);
            broadcast_message(join_message, client_sock);
            break;
        } else {
            // Broadcast public message
            char public_message[BUFFER_SIZE];
            snprintf(public_message, sizeof(public_message), "%s: %s\n", username, buffer);
            broadcast_message(public_message, client_sock);
        }
    }

    // Remove client
    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_CLIENTS; i++) {
        if (clients[i].socket == client_sock) {
            clients[i].socket = 0;
            client_count--;
            break;
        }
    }
    pthread_mutex_unlock(&lock);

    // Update client count on master server
    update_client_count(client_count);

    close(client_sock);
    free(arg);
    return NULL;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printf("Usage: %s <port>\n", argv[0]);
        return 1;
    }

    room_port = atoi(argv[1]);

    // Open chat history file
    open_chat_history();

    // Register with master server
    int sock;
    struct sockaddr_in master_addr;

    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("Socket creation failed");
        return 1;
    }

    master_addr.sin_family = AF_INET;
    master_addr.sin_port = htons(MASTER_PORT);
    inet_pton(AF_INET, MASTER_IP, &master_addr.sin_addr);

    if (connect(sock, (struct sockaddr*)&master_addr, sizeof(master_addr)) < 0) {
        perror("Connection to master server failed");
        close(sock);
        return 1;
    }

    char register_command[32];
    snprintf(register_command, sizeof(register_command), "/register %d", room_port);
    send(sock, register_command, strlen(register_command), 0);
    close(sock);

    int server_sock, new_sock;
    struct sockaddr_in server_addr, client_addr;
    socklen_t addr_size = sizeof(client_addr);

    // Create socket
    server_sock = socket(AF_INET, SOCK_STREAM, 0);
    if (server_sock < 0) {
        perror("Socket creation failed");
        return 1;
    }

    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(room_port);

    if (bind(server_sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Bind failed");
        close(server_sock);
        return 1;
    }

    if (listen(server_sock, MAX_CLIENTS) < 0) {
        perror("Listen failed");
        close(server_sock);
        return 1;
    }

    printf("[ROOM SERVER] Running on port %d...\n", room_port);

    while (1) {
        new_sock = accept(server_sock, (struct sockaddr*)&client_addr, &addr_size);
        if (new_sock < 0) {
            perror("Accept failed");
            continue;
        }

        int *client_sock = malloc(sizeof(int));
        *client_sock = new_sock;

        pthread_t thread;
        if (pthread_create(&thread, NULL, handle_client, client_sock) != 0) {
            perror("Thread creation failed");
            free(client_sock);
            close(new_sock);
        } else {
            pthread_detach(thread);
        }
    }

    close(server_sock);
    fclose(chat_history_file);
    return 0;
}