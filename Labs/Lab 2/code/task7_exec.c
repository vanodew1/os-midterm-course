#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h> // For strdup()

int main(int argc, char *argv[]) {
    printf("Hello world (pid:%d)\n", (int) getpid());
    int rc = fork();
    if (rc < 0) {
        fprintf(stderr, "fork failed\n");
        exit(1);
    }
    else if (rc == 0) // child (new process)
    {
        printf("hello, I am child (pid:%d)\n", (int) getpid());
        char *myargs[3]; // arguments for the new program
        myargs[0] = strdup("ls");  // program: "ls"
        myargs[1] = strdup("-l");  // argument: "-l"
        myargs[2] = NULL;          // marks end of array
        execvp(myargs[0], myargs); // runs ls -l
        // This line is only reached if execvp fails!
        fprintf(stderr, "exec failed\n");
        exit(1);
    }
    else // parent goes down this path
    {
        int wc = wait(NULL); // Parent waits for the child
        int proc_id = (int) getpid();
        printf("hello, I am parent of %d (wc:%d) (pid:%d)\n", rc, wc, proc_id);
    }
    return 0;
}
