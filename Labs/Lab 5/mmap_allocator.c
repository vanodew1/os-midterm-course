#include <stdio.h>
#include <stdlib.h>
#include <sys/mman.h> // For mmap, munmap.
#include <unistd.h>

#define ALLOC_SIZE 4096 // Allocate 4096 bytes

int main() {
    // 1. Allocate memory using mmap
    void *addr = mmap(NULL, ALLOC_SIZE, PROT_READ | PROT_WRITE,
                       MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
    if (addr == MAP_FAILED) {
        perror("mmap failed"); // Print system error message
        return EXIT_FAILURE; // Exit
    }
    printf("Allocated %d bytes at address: %p\n", ALLOC_SIZE, addr);

    // 2. Write data to the allocated memory
    int *int_array = (int *)addr;
    for (int i = 0; i < ALLOC_SIZE / sizeof(int); i++)
        int_array[i] = i * 100;
    printf("Wrote data to the memory region.\n");

    // 3. Read data back from the allocated memory (sample)
    printf("Sample data from memory: %d, %d\n", int_array[6], int_array[7]);

    // 4. Deallocate the memory using munmap
    if (munmap(addr, ALLOC_SIZE) == -1) {
        perror("munmap failed"); // Print system error message
        return EXIT_FAILURE;
    }
    printf("Successfully deallocated memory at address: %p\n", addr);

    return 0;
} 