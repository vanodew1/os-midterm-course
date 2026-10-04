#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main(int argc, char *argv[])
{
    int a = (int) getpid();
    printf("[pid:%d] - Hello Students \n", a);

    int return_child = fork();
    if (return_child < 0) { fprintf(stderr, "fork failed\n"); exit(1); }

    if (return_child == 0) // first child
    {
        printf("[pid:%d] I am the child. My returned child = [%d] \n", (int) getpid(), return_child);
        exit(0); // stop here, do not fork further
    }
    else // original parent continues
    {
        int return_child2 = fork();
        if (return_child2 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }

        if (return_child2 == 0) // second child
        {
            printf("[pid:%d] I am the second child. My returned child2 = [%d] \n", (int) getpid(), return_child2);
            exit(0);
        }
        else // original parent continues
        {
            int return_child3 = fork();
            if (return_child3 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }

            if (return_child3 == 0) // third child
            {
                printf("[pid:%d] I am the third child. My returned child3 = [%d] \n", (int) getpid(), return_child3);
                exit(0);
            }
            else // original parent, after creating all 3 children
            {
                printf("[pid:%d] I am the parent of [%d], [%d], [%d] \n",
                       (int) getpid(), return_child, return_child2, return_child3);
            }
        }
    }
    return 0;
}
