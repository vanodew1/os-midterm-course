#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <unistd.h>

#define MAX_FILES 50

int main(void)
{
    int fds[MAX_FILES];
    printf("😈 The File Descriptor Monster is awake!\n\n");

    for (int i = 0; i < MAX_FILES; i++)
    {
        fds[i] = open("log.txt", O_RDONLY);
        if (fds[i] == -1)
        {
            perror("open failed");
            break;
        }
        printf("Monster opened file descriptor: %d\n", fds[i]);
    }

    printf("\n👹 The monster has finished collecting file descriptors.\n");
    printf("Now we will clean up before things get out of control...\n\n");

    for (int i = 0; i < MAX_FILES; i++)
    {
        if (fds[i] >= 0)
        {
            close(fds[i]);
        }
    }

    printf("All file descriptors have been closed.\n");
    printf("The monster has been contained. 😇\n");
    return 0;
}