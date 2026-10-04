    if (argc != 3)
    {
        fprintf(stderr, "Usage: %s <pattern> <file>\n", argv[0]);
        exit(1);
    }

    // ... fork() as before ...
    else if (rc == 0) // child (new process)
    {
        printf("hello, I am child (pid:%d) \n", (int) getpid());
        char *myargs[4];                 // arguments for the new program
        myargs[0] = strdup("grep");      // program: "grep"
        myargs[1] = strdup(argv[1]);     // argument: pattern typed by user
        myargs[2] = strdup(argv[2]);     // argument: file typed by user
        myargs[3] = NULL;                // marks end of array
        execvp(myargs[0], myargs);
        fprintf(stderr, "exec failed\n");
        exit(1);
    }
