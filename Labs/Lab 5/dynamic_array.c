#include <stdio.h>
#include <stdlib.h>

int main(void){
    int n;

    // part a (ask the user how many integers to store)
    printf("How many integers would you like to store? ");
    if (scanf("%d", &n) != 1) {
        fprintf(stderr, "Invalid input.\n");
        return 1;
    }

    //part b (dynamically allocate exact memory for n integers)
    
    int *arr = malloc(n * sizeof(int));

    //part c (check whether malloc failed)
    if (arr == NULL) {
        //part d report error and exit with non-zero status
        fprintf(stderr, "Error: memroy allocation failed.\n");
        return 1;
    }

    //part e (populate array with user values)
    printf("Enter %d integers:\n",n);
    for (int i = 0; i < n; i++){
        printf(" [%d]: ", i);
        scanf("%d", &arr[i]);
    }

    //part f (print array contents)
    printf("\nArray contents: ");
    for (int i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    //part f again (free memory and null out pointer to
    // avoid dangling pointer references

    free(arr);
    arr = NULL;

    return 0;
}