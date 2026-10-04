#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char *argv[])
{
    int a = (int) getpid();
    printf("[pid:%d] - Hello Students \n", a);

    int return_child = fork();

    if (return_child < 0)
    {
        fprintf(stderr, "fork failed\n");
        exit(1);
    }

    if (return_child == 0) // child (new process)
    {
        sleep(1); // child sleeps 1s before printing
        printf("-------------------------------------------------------\n");
        printf("[pid:%d] I am the child. My returned child = [%d] \n", (int) getpid(), return_child);
        printf("-------------------------------------------------------\n");
    }
    else // parent continues from here
    {
        sleep(2); // parent sleeps 2s before printing
        printf("[pid:%d] I am parent of [%d] \n", (int) getpid(), return_child);
    }

    return 0;
}
