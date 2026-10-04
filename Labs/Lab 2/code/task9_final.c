#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>

int main(int argc, char *argv[])
{
    if (argc != 3)
    {
        fprintf(stderr, "Usage: %s <string> <file>\n", argv[0]);
        exit(1);
    }

    char *user_string = argv[1];
    char *filename = argv[2];
    printf("Parent starting (pid:%d)\n", (int) getpid());

    // ---------- Child 1: grep ----------
    int pid1 = fork();
    if (pid1 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }
    else if (pid1 == 0)
    {
        printf("Child 1 (pid:%d) running grep\n", (int) getpid());
        char *args1[4] = { strdup("grep"), strdup("pid"), strdup(filename), NULL };
        execvp(args1[0], args1);
        fprintf(stderr, "exec failed for grep\n"); exit(1);
    }

    // ---------- Child 2: wc ----------
    int pid2 = fork();
    if (pid2 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }
    else if (pid2 == 0)
    {
        printf("Child 2 (pid:%d) running wc\n", (int) getpid());
        char *args2[3] = { strdup("wc"), strdup(filename), NULL };
        execvp(args2[0], args2);
        fprintf(stderr, "exec failed for wc\n"); exit(1);
    }

    // ---------- Child 3: cat ----------
    int pid3 = fork();
    if (pid3 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }
    else if (pid3 == 0)
    {
        printf("Child 3 (pid:%d) running cat\n", (int) getpid());
        char *args3[3] = { strdup("cat"), strdup(filename), NULL };
        execvp(args3[0], args3);
        fprintf(stderr, "exec failed for cat\n"); exit(1);
    }

    // ---------- Child 4: echo ----------
    int pid4 = fork();
    if (pid4 < 0) { fprintf(stderr, "fork failed\n"); exit(1); }
    else if (pid4 == 0)
    {
        printf("Child 4 (pid:%d) running echo\n", (int) getpid());
        char *args4[3] = { strdup("echo"), strdup(user_string), NULL };
        execvp(args4[0], args4);
        fprintf(stderr, "exec failed for echo\n"); exit(1);
    }

    // ---------- Parent waits for all four children ----------
    int wc1 = waitpid(pid1, NULL, 0);
    int wc2 = waitpid(pid2, NULL, 0);
    int wc3 = waitpid(pid3, NULL, 0);
    int wc4 = waitpid(pid4, NULL, 0);
    printf("Parent (pid:%d) done. Children finished: %d %d %d %d\n",
           (int) getpid(), wc1, wc2, wc3, wc4);
    return 0;
}
