//part a
#include <stdio.h>
#include <stdint.h>

#define MAX_PROCESSES 2
#define MEMORY_SIZE 8192
#define SUCCESS 0
#define ERROR_BOUNDS -1

struct process {
    int pid;
    int base;
    int bounds;
};
//Exact-width unsigned integer type that is exactly 8 bits wide
uint8_t memory[MEMORY_SIZE];
struct process proc_list[MAX_PROCESSES];

//part b create two processes and assign them base and bound values
void init_processes () {
    // Process 1: PID = 1, Base = 1000, Bounds = 500
    proc_list[0].pid = 1; proc_list[0].base = 1000; proc_list[0].bounds = 500;

    // Process 2: PID = 2, Base = 3000, Bounds = 300
    proc_list[1].pid = 2; proc_list[1].base = 3000; proc_list[1].bounds = 300;

    // Print Layout
    printf("Memory Layout:\n");
    for (int i = 0; i < MAX_PROCESSES; i++)
        printf("Process %d: Base = %d, Bounds=%d \n",
            proc_list[i].pid, proc_list[i].base, proc_list[i].bounds);
}

// part c address translation
int translate(int pid, int virtual_address, int *physical_address){
    // returns -1 if virtual address is out of bounds.
    // returns 0 on success & stores the physical address in *physical address
    for (int i = 0; i < MAX_PROCESSES; i++) {
        if (proc_list[i].pid == pid) { // find the process
            if (virtual_address < 0 || virtual_address >= proc_list[i].bounds)
                return ERROR_BOUNDS;   // bounds check
            *physical_address = proc_list[i].base + virtual_address; //physical = base + virtual
            return SUCCESS;
        }
    }
    return ERROR_BOUNDS;
}

//testing the address translation
void test_translation (int pid, int virtual_address, uint8_t value) {
    int physical_address;
    int result = translate (pid, virtual_address, &physical_address);

    if (result == SUCCESS)
    {
        memory[physical_address] = value;
        printf("[OK] PID %d: Wrote %d to VA %d (PA %d) \n", pid, value, virtual_address, physical_address);
    }
    else
        printf("[FAULT] PID %d: VA %d out of bounds \n", pid, virtual_address);
}

// writing test cases for the program
int main()
{
    init_processes();
    // Test cases
    test_translation(1, 0, 65);     // Should succeed
    test_translation(1, 499, 66);   // Should succeed
    test_translation(1, 500, 67);   // Should fail (out of bounds)
    test_translation(1, 999, 100);  // Should fail (out of bounds)
    test_translation(2, 128, 77);   // Should succeed
    test_translation(2, 499, 78);   // Should fail (out of bounds)
    return 0;
}