#include <stdio.h>
#include <stdint.h>

#define MAX_PROCESSES 2
#define MEMORY_SIZE 8192

//Segment types
#define SEG_CODE 0
#define SEG_DATA 1
#define SEG_HEAP 2
#define SEG_STACK 3
#define SEGMENT_COUNT 4

//Error codes (again, this has to be a bit more complicated than before)
#define SUCCESS 0
#define ERROR_BOUNDS -1
#define ERROR_INVALID_PID -2
#define ERROR_INVALID_SEGMENT -3

// Global segment names for readability
char* seg_names[] = {"code", "data", "heap", "stack"};

struct segment {
    int base;
    int bounds; // also called size
};

struct process {
    int pid;
    struct segment segments[SEGMENT_COUNT];
};

uint8_t memory[MEMORY_SIZE];
struct process proc_list[MAX_PROCESSES];

//part b (initalize segmented process)
void set_segment(struct process *p, int seg, int base, int bounds)
{
    p->segments[seg].base = base;
    p->segments[seg].bounds = bounds;
}

void init_segmented_processes()
{
    // process 1 (PID = 1) - code: (base = 1000, size = 400)
    // data (6500, 200); heap (7000, 500); stack (4000, 500)
    proc_list[0].pid = 1;
    set_segment(&proc_list[0], SEG_CODE,  1000, 400);
    set_segment(&proc_list[0], SEG_DATA,  6500, 200);
    set_segment(&proc_list[0], SEG_HEAP,  7000, 500);
    set_segment(&proc_list[0], SEG_STACK, 4000, 500);
 
    // process 2 (PID = 2)
    // code (6000, 300); data (3500, 100); heap (2000, 600); stack (3000, 400)
    proc_list[1].pid = 2;
    set_segment(&proc_list[1], SEG_CODE,  6000, 300);
    set_segment(&proc_list[1], SEG_DATA,  3500, 100);
    set_segment(&proc_list[1], SEG_HEAP,  2000, 600);
    set_segment(&proc_list[1], SEG_STACK, 3000, 400);
 
    // print each process, prints base and bounds for all 4 segments.
    printf("Memory Layout:\n");
    for (int i = 0; i < MAX_PROCESSES; i++) {
        printf("Process %d:\n", proc_list[i].pid);
        for (int s = 0; s < SEGMENT_COUNT; s++)
            printf("  %-5s: Base=%d, Bounds=%d\n", seg_names[s],
                   proc_list[i].segments[s].base,
                   proc_list[i].segments[s].bounds);
    }
    printf("\n");
}

//part c (translation)
int segmented_translate(int pid, int segment, int offset, int *physical_address)
{
    // Return (0) on success, & place the physical address in *physical_address
    // Return ERROR_INVALID_PID (-2) if PID not found
    // Return ERROR_INVALID_SEGMENT (-3) if segment ID is invalid
    // Return ERROR_BOUNDS (-1) if offset is out of bounds
 
    // find the process
    struct process *p = NULL;
    for (int i = 0; i < MAX_PROCESSES; i++)
        if (proc_list[i].pid == pid) { p = &proc_list[i]; break; }
    if (p == NULL)
        return ERROR_INVALID_PID;
 
    // check the segment ID
    if (segment < 0 || segment >= SEGMENT_COUNT)
        return ERROR_INVALID_SEGMENT;
 
    // bounds check: 0 <= offset < bounds
    struct segment seg = p->segments[segment];
    if (offset < 0 || offset >= seg.bounds)
        return ERROR_BOUNDS;
 
    // translate: stack grows downward (subtract), the rest grow upward (add)
    if (segment == SEG_STACK)
        *physical_address = seg.base - offset;
    else
        *physical_address = seg.base + offset;
 
    return SUCCESS;
}

// part d testing memory access
void test_segment_access(int pid, int segment, int offset, uint8_t value)
{
    int physical_address, result;
    result = segmented_translate(pid, segment, offset, &physical_address);
    switch (result) {
        case SUCCESS:
            memory[physical_address] = value;
            printf("[OK] PID %d: SEG=%s offset=%d -> PA=%d\n",
                   pid, seg_names[segment], offset, physical_address);
            break;
 
        case ERROR_INVALID_PID:
            printf("[ERROR] PID %d not found\n", pid);
            break;
 
        case ERROR_INVALID_SEGMENT:
            printf("[ERROR] Invalid segment ID: %d\n", segment);
            break;
 
        case ERROR_BOUNDS:
            printf("[FAULT] PID %d: Out of bounds\n", pid);
            break;
    }
}

//part e main 
int main()
{
    init_segmented_processes();
    // Required test cases
    test_segment_access(1, SEG_CODE, 206, -1);    // Should succeed -> PA=1206
    test_segment_access(1, SEG_HEAP, 350, 66);    // Should succeed -> PA=7350
    test_segment_access(1, SEG_STACK, 500, 67);   // Should fail (bounds)
    test_segment_access(2, SEG_CODE, 299, -1);    // Should succeed -> PA=6299
    test_segment_access(3, SEG_CODE, 0, 99);      // Should fail (invalid PID)
    test_segment_access(1, 5, 0, 88);             // Should fail (invalid segment)
    return 0;
}