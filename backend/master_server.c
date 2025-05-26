#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <pthread.h>

#define PORT 8080
#define BUFFER_SIZE 1024
#define MAX_ROOMS 10

typedef struct {
    int port;
    int client_count;
} ChatRoom;

ChatRoom rooms[MAX_ROOMS];
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

void list_rooms(int client_sock) {
    char buffer[BUFFER_SIZE];
    memset(buffer, 0, BUFFER_SIZE);
    strcat(buffer, "Available rooms:\n");

    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_ROOMS; i++) {
        if (rooms[i].port != 0) {
            char room_info[64];
            snprintf(room_info, sizeof(room_info), "Room %d (Port: %d, Clients: %d)\n", 
                     i + 1, rooms[i].port, rooms[i].client_count);
            strcat(buffer, room_info);
        }
    }
    pthread_mutex_unlock(&lock);

    send(client_sock, buffer, strlen(buffer), 0);
}

void register_room(int port) {
    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_ROOMS; i++) {
        if (rooms[i].port == 0) { // Empty slot
            rooms[i].port = port;
            rooms[i].client_count = 0;
            printf("[MASTER] Room registered on port %d\n", port);
            break;
        }
    }
    pthread_mutex_unlock(&lock);
}

void update_client_count(int port, int count) {
    pthread_mutex_lock(&lock);
    for (int i = 0; i < MAX_ROOMS; i++) {
        if (rooms[i].port == port) {
            rooms[i].client_count = count;
            printf("[MASTER] Updated client count for room on port %d to %d\n", port, count);
            if (count == 0) {
                printf("[MASTER] Removing empty room on port %d\n", port);
                rooms[i].port = 0; // Remove room when empty
            }
            break;
        }
    }
    pthread_mutex_unlock(&lock);
}

void *handle_client(void *arg) {
    int client_sock = *(int *)arg;
    char buffer[BUFFER_SIZE];

    while (1) {
        memset(buffer, 0, BUFFER_SIZE);
        int bytes_received = recv(client_sock, buffer, BUFFER_SIZE - 1, 0);
        if (bytes_received <= 0) {
            close(client_sock);
            free(arg);
            return NULL;
        }

        buffer[bytes_received] = '\0';

        if (strcmp(buffer, "/list") == 0) {
            list_rooms(client_sock);
        } else if (strncmp(buffer, "/join", 5) == 0) {
            int room_id = atoi(buffer + 6) - 1;
            if (room_id >= 0 && room_id < MAX_ROOMS && rooms[room_id].port != 0) {
                char response[64];
                snprintf(response, sizeof(response), "JOIN %d", rooms[room_id].port);
                send(client_sock, response, strlen(response), 0);
            } else {
                send(client_sock, "Invalid room ID.\n", 17, 0);
            }
        } else {
            send(client_sock, "Unknown command.\n", 17, 0);
        }
    }
}

int main() {
    int master_sock, new_sock;
    struct sockaddr_in server_addr, client_addr;
    socklen_t addr_size = sizeof(client_addr);

    memset(rooms, 0, sizeof(rooms));

    master_sock = socket(AF_INET, SOCK_STREAM, 0);
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    bind(master_sock, (struct sockaddr*)&server_addr, sizeof(server_addr));
    listen(master_sock, 10);

    printf("[MASTER SERVER] Running on port %d...\n", PORT);

    while (1) {
        new_sock = accept(master_sock, (struct sockaddr*)&client_addr, &addr_size);
        if (new_sock < 0) {
            perror("Accept failed");
            continue;
        }

        int *client_sock = malloc(sizeof(int));
        *client_sock = new_sock;

        pthread_t thread;
        pthread_create(&thread, NULL, handle_client, client_sock);
        pthread_detach(thread);
    }

    close(master_sock);
    return 0;
}