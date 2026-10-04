#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    pid_t pid = getpid();   //Get process ID
    uid_t uid = getuid();   //Get user ID

    // Open (or create) a file for writing
    int fd = open("log.txt", O_CREAT | O_WRONLY | O_APPEND, 0644);
    if (fd < 0)
    {
        write(STDERR_FILENO, "Failed to open file.\n", 22);
        return 1;
    }

    // Prepare output
    char buffer[128];
    int len = snprintf(buffer, sizeof(buffer), "PID: %d \t UID: %d \n", pid, uid);

    write(fd, buffer, len);
    write(STDOUT_FILENO, "Log written to file.\n", 22); //Confirmation

    // Task 1
    const char *prompt = "Enter a message: ";
    write(STDOUT_FILENO, prompt, strlen(prompt));

    char input[64];
    int n = read(STDIN_FILENO, input, 63);

    input[n] = '\0';

    char log[128];
    int loglength = snprintf(log, sizeof(log), "User input: %s", input);
    write (fd, log, loglength);

    const char *safe = "Your input was saved\n";
    write(STDOUT_FILENO, safe, strlen(safe));

    close(fd);
    return 0;
}