#include <stdio.h>
#include <stddef.h>
#include <unistd.h>
#include <sys/mman.h>

// Task 7
typedef struct MemBlock {
    size_t size;
    int is_free;
    struct MemBlock *next;
} MemBlock;

#define HDR sizeof(MemBlock)

static MemBlock *head = NULL;

//Task 8 helper(get more memory from OS via mmap)

static MemBlock *request_space(MemBlock *last, size_t size){
    size_t page = (size_t)sysconf(_SC_PAGESIZE);
    size_t total = ((HDR+size+page-1)/page)*page; //round up to a page

    MemBlock *block = mmap(NULL, total, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
    if (block == MAP_FAILED) return NULL;

    block->size = total - HDR;
    block->is_free = 1;
    block->next = NULL;
    if (last != NULL) last->next = block; //link to the end of list
    return block;
}

//Task 8 helper(walk the list for a free block big enough)
static MemBlock *find_free_block(MemBlock **last, size_t size) {
    MemBlock *curr = head;
    while (curr != NULL && !(curr->is_free && curr->size >= size)) {
        *last = curr;
        curr = curr->next;
    }
    return curr;
}

//Task 8 helper (split a block if bigger than needed)
static void split_block(MemBlock *block, size_t size) {
    if (block->size >= size+HDR+1){
        MemBlock *new_block = (MemBlock *)((char *)block + HDR + size);
        new_block->size = block->size -size - HDR;
        new_block->is_free = 1;
        new_block->next = block->next;
        block->size = size;
        block->next = new_block;
    }
}

//Actual task 8
void *my_malloc(size_t size) {
    if (size == 0) return NULL; //bad case

    MemBlock *last = head;
    MemBlock *block = (head != NULL) ? find_free_block(&last,size) : NULL;

    if (block == NULL) {        //nothing free fits so we ask OS
        block = request_space(last, size);
        if (block == NULL) return NULL;     //OS fails, another bad case
        if (head == NULL) head = block;
    }

    split_block(block, size);
    block->is_free = 0;
    return (void *)(block + 1);             //memory right after header
}

//Task 9
void my_free(void *ptr) {
    if (ptr == NULL) return;
    MemBlock *block = (MemBlock *)ptr -1;
    block->is_free = 1;

    if (block->next != NULL && block->next->is_free){
        block->size += HDR + block->next->size;
        block->next = block->next->next;
    }
}

//Task 10
int main(void) {
    // normal cases
    void *small  = my_malloc(16);
    void *medium = my_malloc(256);
    void *large  = my_malloc(4096);
    printf("small=%p medium=%p large=%p\n", small, medium, large);
 
    my_free(large);
    my_free(medium);
    my_free(small);
 
    void *reuse = my_malloc(16);                    // should reuse freed space
    printf("reuse=%p (should match small)\n", reuse);
 
    void *a = my_malloc(32), *b = my_malloc(64), *c = my_malloc(128);
    my_free(b); my_free(a); my_free(c);              // mixed-order free
 
    // b. bad cases
    printf("my_malloc(0) = %p (expect NULL)\n", my_malloc(0));
    my_free(NULL);
    printf("my_free(NULL) ok\n");
 
    return 0;
}