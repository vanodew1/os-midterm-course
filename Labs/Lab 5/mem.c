#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, "usage: mem <value>\n");
        exit(1);
    }

    int *p;
    p = malloc(sizeof(int));
    assert(p != NULL);

    printf("(%d) addr pointed to by p: %p\n", (int)
        getpid(), (void *)p);
    
    *p = atoi(argv[1]); // assign value to addr stored in p
    while (1){
        sleep(1);
        *p = *p + 1;
        printf("(%d) value of p: %d\n", getpid(), *p);
    }
    return 0;
    //a yea every process gets its own unique pid
    //b if aslr on so itd be different otherwise the same
    //c even tho virtual address looks identical, each process has its own
    // private page table mapping so values stored there are completely 
    // seperate



    // 45777 45820 46143 
}