#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL){
        fprintf(stderr, "Allocation fails.\n");
        return 1;
    }
    *p = 42;
    printf("Before free: *p = %d\n", *p);

    free(p); // memory correctly released here
    // but we keep using pointer after its been freed
    printf("After free (use-after-free read): *p = %d\n", *p);

    *p = 99;

    printf("After free (use-after-free write): *p = %d\n", *p);
    return 0;
}