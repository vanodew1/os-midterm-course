#include <stdlib.h>
#include <stdio.h>

int main()
{
    printf("Attempting to allocate memory...\n");
    // Allocate 100 integers
    int *data = (int * )malloc(100 * sizeof(int));

    //Always check if malloc returned NULL

    if (data == NULL)
    {
        fprintf(stderr, "Memory allocation failed! \n");
        return 1;
    }

    //Populate a few elements
    for (int i = 0; i < 10; i++)
        data[i] = i * 100;
    printf("Memory allocated at %p and used some of it.\n", 
    (void *)data);

    // We intentionally forget to free memory here
    printf("Program finished, but memory was not deallocated.\n");
    return 0;
    // Program exits
    // Memory is still held by the process until OS reclaims it.
}