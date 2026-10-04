#include <stdio.h>
#include <stdlib.h>

// Allocates memory inside a function and never frees it before
// return. The pointer goes out of scope, so the caller has no
// way to free the block, its unreachable.

void leaky_function(void){
    int *data = malloc(50 * sizeof(int));
    if (data==NULL){
        fprintf(stderr, "Allocation failed.\n");
        return;
    }
    for (int i = 0; i < 50; i++){
        data[i] = i;
    }
    printf("leaky_function allocated and used 50 ints, but never freed em");
}

int main(void){
    //First leak: allocate directly in main and never free
    int *arr = malloc(10 * sizeof(int));
    if (arr==NULL){
        fprintf(stderr, "Allocation failed.\n");
    }
    for (int i = 0; i < 10; i++){
        arr[i] = i * i;
    }
    printf("main: allocated 10 ints, but never freed em.\n");

    //Leak 2: allocate inside a function, never freed, pointer lost on return
    leaky_function();

    return 0;
}