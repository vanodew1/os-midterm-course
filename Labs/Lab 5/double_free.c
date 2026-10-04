#include <stdio.h>
#include <stdlib.h>
 
int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL) {
        fprintf(stderr, "Allocation failed.\n");
        return 1;
    }

    *p = 7;
    printf("Allocated and set *p = %d\n", *p);

    free(p);
    printf("Freed p once.\n");

    //double free corrupts heap's free list metadata
    free(p);
    printf("Freed p twice");
}
