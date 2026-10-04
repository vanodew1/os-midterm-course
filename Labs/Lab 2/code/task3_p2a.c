    if (return_child == 0) // child (new process)
    {
        printf("-------------------------------------------------------\n");
        printf("[pid:%d] I am the child. My returned child = [%d] \n", (int) getpid(), return_child);
        printf("-------------------------------------------------------\n");
        sleep(100);
    }
    else // parent continues from here
    {
        sleep(100);
        printf("[pid:%d] I am parent of [%d] \n", (int) getpid(), return_child);
    }
