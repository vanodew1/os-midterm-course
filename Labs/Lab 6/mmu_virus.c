#include <stdio.h>
#include <stdint.h>

#define MAX_PROCESSES 2
#define MEMORY_SIZE 8192
#define SEG_CODE 0
#define SEG_DATA 1
#define SEG_HEAP 2
#define SEG_STACK 3
#define SEGMENT_COUNT 4

#define SUCCESS 0
#define ERROR_BOUNDS -1

#define CHECK_BOUNDS 0  // <- flip to 0 to see the "virus" succeed

struct segment { int base; int bounds; };
struct process { int pid; struct segment segments[SEGMENT_COUNT]; };

uint8_t memory[MEMORY_SIZE];
struct process proc_list[MAX_PROCESSES];

void init() {
    proc_list[0].pid = 1;
    proc_list[0].segments[SEG_CODE]  = (struct segment){1000, 400};
    proc_list[0].segments[SEG_DATA]  = (struct segment){6500, 200};
    proc_list[0].segments[SEG_HEAP]  = (struct segment){7000, 500};
    proc_list[0].segments[SEG_STACK] = (struct segment){4000, 500};

    proc_list[1].pid = 2;
    proc_list[1].segments[SEG_CODE]  = (struct segment){6000, 300};
    proc_list[1].segments[SEG_DATA]  = (struct segment){3500, 100};
    proc_list[1].segments[SEG_HEAP]  = (struct segment){2000, 600};
    proc_list[1].segments[SEG_STACK] = (struct segment){3000, 400};

    /* Victim's secret in PID 2's stack region */
    memory[3900] = 0x53; memory[3901] = 0x45;
    memory[3902] = 0x43; memory[3903] = 0x52;   // "SECR"
}

/* MMU: translate. If CHECK_BOUNDS==0, bounds are ignored. */
int mmu(int pid, int seg, int offset, int *pa) {
    struct process *p = NULL;
    for (int i = 0; i < MAX_PROCESSES; i++)
        if (proc_list[i].pid == pid) { p = &proc_list[i]; break; }
    if (!p) return -1;

#if CHECK_BOUNDS
    if (offset < 0 || offset >= p->segments[seg].bounds)
        return ERROR_BOUNDS;
#endif

    *pa = (seg == SEG_STACK)
        ? p->segments[seg].base - offset
        : p->segments[seg].base + offset;
    return SUCCESS;
}

void attack(const char *name, int pid, int seg, int offset) {
    int pa, r = mmu(pid, seg, offset, &pa);
    printf("\n[ATTACK] %s\n", name);
    printf("  PID=%d SEG=%d offset=%d\n", pid, seg, offset);

    if (r == SUCCESS)
        printf("ALLOWED -> PA=%d byte=0x%02X\n", pa, memory[pa]);
    else
        printf("BLOCKED (bounds error)\n");
}

int main() {
    init();
    printf("=== MMU Virus Demo (bounds=%s) ===\n",
           CHECK_BOUNDS ? "ON" : "OFF");

    /* Attack 1: read past own code segment into victim's memory */
    attack("Out-of-bounds read", 1, SEG_CODE, 2900);

    /* Attack 2: negative offset -> wraps below base */
    attack("Negative offset wrap", 1, SEG_CODE, -200);

    return 0;
}