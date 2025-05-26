#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

#define BUFFER_SIZE 1024
#define MASTER_IP "127.0.0.1"
#define MASTER_PORT 8080

int main() {
    int sock;
    struct sockaddr_in server_addr;
    char buffer[BUFFER_SIZE];

    // Create socket
    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        perror("Socket creation failed");
        return 1;
    }

    // Configure server address
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(MASTER_PORT);
    inet_pton(AF_INET, MASTER_IP, &server_addr.sin_addr);

    // Connect to master server
    if (connect(sock, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Connection to master server failed");
        close(sock);
        return 1;
    }

    printf("Connected to master server.\n");

    // Main loop
    while (1) {
        printf("Enter a command (/join <room_id>, /exit): ");
        fgets(buffer, BUFFER_SIZE, stdin);
        buffer[strcspn(buffer, "\n")] = '\0'; // Remove newline

        if (strcmp(buffer, "/exit") == 0) {
            printf("Exiting...\n");
            break;
        }

        // Send command to master server
        send(sock, buffer, strlen(buffer), 0);

        // Receive response from master server
        memset(buffer, 0, BUFFER_SIZE);
        int bytes_received = recv(sock, buffer, BUFFER_SIZE - 1, 0);
        if (bytes_received <= 0) {
            printf("Server disconnected.\n");
            break;
        }
        buffer[bytes_received] = '\0';
        printf("Server: %s\n", buffer);
    }

    close(sock);
    return 0;
}