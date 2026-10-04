#include <stdio.h>
#include <stdlib.h>

int main(void){
    //part a code segment (address of main() function itself)
    printf("Code segment (main function) : %p\n",
        (void *)main);
    
    //part b heap segment (dynamically allocated 2 Mib Block)
    size_t size = 2 * 1024 * 1024; // 2 Mib
    void *heap_block = malloc(size);
    if (heap_block == NULL) {
        fprintf(stderr, "malloc failed\n");
        return 1;

    }
    printf("Heap segment (2 Mib malloc) : %p\n", heap_block);

    //part c stack segment (local variable)
    int hhh = 42;
    printf("Stack segment (local variable): %p\n", 
        (void *)&hhh);
    
        free(heap_block);
        return 0;
    //they do change meaning that ASLR in action

    // to disable sudo sh -c "echo 0 > /proc/sys/kernel/randomize_va_space"
    // to reenable sudo sh -c "echo 2 > /proc/sys/kernel/randomize_va_space"

    // ASLR randomizes base addresses so its harder for attackers to predict
    // memory addresses to exploit memory-corruption attacks and stuff like that
    
}