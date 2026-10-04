#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    int a = (int) getpid();
    printf("[pid:%d] - Hello Students \n", a);

    int return_child = fork();

    // Checking if creating child process failed
    if (return_child < 0)
    {
        fprintf(stderr, "fork failed\n");
        exit(1);
    }

    // You've reached here, which means a child process was created
    if (return_child == 0) // child (new process)
    {
        printf("-------------------------------------------------------\n");
        printf("[pid:%d] I am the child. My returned child = [%d] \n", (int) getpid(), return_child);
        printf("-------------------------------------------------------\n");
    }
    else // parent continues from here
        printf("[pid:%d] I am parent of [%d] \n", (int) getpid(), return_child);

    return 0;
}
