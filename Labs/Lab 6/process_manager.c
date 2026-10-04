#include <stdio.h>
#include <string.h>
 
#define MAX_PROCESSES 5
#define MEMORY_SIZE 2048
 
//part a basic structure
struct segment {
    int base, limit;
};
 
struct process {
    int pid, is_active;
    struct segment code, data, heap, stack;
};
 
//part b memory manager
struct {
    struct process processes[MAX_PROCESSES];
    char memory[MEMORY_SIZE];
    int next_address; // Tracks the next available address
} manager;

//part c initialize the manager
void init_manager() {
    for (int i = 0; i < MAX_PROCESSES; i++)
        manager.processes[i].is_active = 0;
    manager.next_address = 0;
}
 
// Returns the index of the active process with this pid, or -1 
int find_process(int pid) {
    for (int i = 0; i < MAX_PROCESSES; i++)
        if (manager.processes[i].is_active && manager.processes[i].pid == pid)
            return i;
    return -1;
}

// part d create a process
// Allocates code, heap and stack contiguously. Returns 0 on success, -1 on failure. 
int create_process(int pid, int code_size, int heap_size, int stack_size) {
    if (code_size <= 0 || heap_size <= 0 || stack_size <= 0) {
        printf("Error: segment sizes must be positive\n");
        return -1;
    }
    if (find_process(pid) != -1) {
        printf("Error: process %d already exists\n", pid);
        return -1;
    }
 
    // Find a free slot in the process table
    int slot = -1;
    for (int i = 0; i < MAX_PROCESSES; i++)
        if (!manager.processes[i].is_active) { slot = i; break; }
    if (slot == -1) {
        printf("Error: process table full (max %d)\n", MAX_PROCESSES);
        return -1;
    }
 
    // Check there is enough memory left
    int total = code_size + heap_size + stack_size;
    if (manager.next_address + total > MEMORY_SIZE) {
        printf("Error: not enough memory (need %d, only %d free)\n",
               total, MEMORY_SIZE - manager.next_address);
        return -1;
    }
 
    // Lay out code -> heap -> stack back to back
    struct process *p = &manager.processes[slot];
    p->pid = pid;
    p->code.base  = manager.next_address;       p->code.limit  = code_size;
    p->heap.base  = p->code.base + code_size;   p->heap.limit  = heap_size;
    p->stack.base = p->heap.base + heap_size;   p->stack.limit = stack_size;
    p->data.base  = 0;                          p->data.limit  = 0;  // not used here
    p->is_active  = 1;
 
    manager.next_address += total;
    printf("Process %d created\n", pid);
    return 0;
}

// part e terminate a process
int terminate_process(int pid) {
    int i = find_process(pid);
    if (i == -1) {
        printf("Error: process %d not found\n", pid);
        return -1;
    }
    manager.processes[i].is_active = 0;
    printf("Process %d terminated\n", pid);
    return 0;
}

// part f showing the memory map
void print_segment(const char *name, struct segment s) {
    printf("  %s: [%d-%d] size=%d\n", name, s.base, s.base + s.limit - 1, s.limit);
}
 
void show_memory_map() {
    printf("=== Memory Map ===\n");
    for (int i = 0; i < MAX_PROCESSES; i++) {
        struct process *p = &manager.processes[i];
        if (!p->is_active) continue;
        printf("Process %d:\n", p->pid);
        print_segment("code",  p->code);
        print_segment("heap",  p->heap);
        print_segment("stack", p->stack);
    }
}

// part g listing active processes
void list_processes() {
    printf("=== Active Processes ===\n");
    for (int i = 0; i < MAX_PROCESSES; i++)
        if (manager.processes[i].is_active)
            printf("PID %d\n", manager.processes[i].pid);
}

// the shell
int main() {
    char line[128], cmd[32];
    int pid, code, heap, stack;
 
    init_manager();
 
    while (1) {
        printf("> ");
        fflush(stdout);
        if (fgets(line, sizeof line, stdin) == NULL)   // Ctrl+D / end of file
            break;
        if (sscanf(line, "%31s", cmd) != 1)            // empty line
            continue;
 
        if (strcmp(cmd, "create") == 0) {
            if (sscanf(line, "%*s %d %d %d %d", &pid, &code, &heap, &stack) == 4)
                create_process(pid, code, heap, stack);
            else
                printf("Usage: create <pid> <code> <heap> <stack>\n");
        }
        else if (strcmp(cmd, "terminate") == 0) {
            if (sscanf(line, "%*s %d", &pid) == 1)
                terminate_process(pid);
            else
                printf("Usage: terminate <pid>\n");
        }
        else if (strcmp(cmd, "mem") == 0 || strcmp(cmd, "map") == 0)
            show_memory_map();
        else if (strcmp(cmd, "list") == 0)
            list_processes();
        else if (strcmp(cmd, "exit") == 0)
            break;
        else
            printf("Unknown command: %s\n", cmd);
 
        printf("\n");
    }
    return 0;
}