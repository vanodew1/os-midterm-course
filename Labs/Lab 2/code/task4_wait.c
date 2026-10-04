#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h> // Needed for wait()

int main(int argc, char *argv[]) {
    printf("Hello world (pid:%d)\n", (int) getpid());

    int return_child = fork();

    if (return_child < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    }
    else if (return_child == 0) // child (new process)
    {
        printf("hello, I am child (pid:%d)\n", (int) getpid());
        sleep(5); // even with a delay here, the parent still prints last
    }
    else // parent goes down this path
    {
        int wc = wait(NULL); // Parent waits for a child
        int proc_id = (int) getpid();
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", return_child, wc, proc_id);
    }
    return 0;
}
