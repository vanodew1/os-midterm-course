#include <stdio.h>
#include <stdlib.h>
#define NUM_QUEUES 3
#define QUANTUM 10
#define MAX_JOBS 50
#define ARRIVAL_GAP 15 // a new short job shows up every 15 ticks

// 1. Structure of an MLFQ Job (same shape as Section 4.3)
typedef struct {
    int id;
    int arrival_time;
    int burst_time;
    int remaining_time;
    int current_queue;
    int allot_left;
    int end_time;
    int done;
} Job;

Job job_list[MAX_JOBS];
int total_jobs = 0;

// A fresh, short interactive job cuts the line every ARRIVAL_GAP ticks
void maybe_spawn_new_arrival(int now) {
    if (now > 0 && now % ARRIVAL_GAP == 0 && total_jobs < MAX_JOBS) {
        Job newcomer = {total_jobs + 1, now, 4, 4, 0, QUANTUM, 0, 0};
        job_list[total_jobs++] = newcomer;
        printf("[t=%d] New job: %d (burst=4)\n", now, newcomer.id);
    }
}

// 2. Scheduler Logic (boost_period = 0 disables Rule 5 entirely)
void run_mlfq(int boost_period) {
    int now = 0, completed = 0;
    int starved_start_3 = -1, starved_start_4 = -1;

    // Job 1 & 2: short interactive jobs (same as Section 4.3)
    job_list[0] = (Job){1, 0, 5, 5, 0, QUANTUM, 0, 0};
    job_list[1] = (Job){2, 2, 8, 8, 0, QUANTUM, 0, 0};
    // Job 3 & 4: TWO long CPU-bound jobs, competing at the bottom queue
    job_list[2] = (Job){3, 0, 100, 100, 0, QUANTUM, 0, 0};
    job_list[3] = (Job){4, 5, 100, 100, 0, QUANTUM, 0, 0};
    total_jobs = 4;

    while (completed < total_jobs) {
        maybe_spawn_new_arrival(now);

        // Rule 5: periodically boost every unfinished job to queue 0
        if (boost_period > 0 && now > 0 && now % boost_period == 0) {
            for (int i = 0; i < total_jobs; i++)
                if (!job_list[i].done) job_list[i].current_queue = 0;
        }

        int pick = -1;
        for (int i = 0; i < total_jobs; i++) {
            Job *j = &job_list[i];
            if (j->done || j->arrival_time > now) continue;
            if (pick == -1 || j->current_queue < job_list[pick].current_queue)
                pick = i;
        }
        if (pick == -1) { now++; continue; }

        if (job_list[pick].id == 3 && starved_start_3 == -1)
            starved_start_3 = now;
        if (job_list[pick].id == 4 && starved_start_4 == -1)
            starved_start_4 = now;

        job_list[pick].remaining_time--;
        now++;

        if (job_list[pick].remaining_time == 0) {
            job_list[pick].done = 1;
            job_list[pick].end_time = now;
            completed++;
        } else if (--job_list[pick].allot_left == 0) {
            job_list[pick].current_queue++;
            job_list[pick].allot_left = QUANTUM;
        }
    }

    printf("Job 3 finished at t=%d (first ran at t=%d)\n",
        job_list[2].end_time, starved_start_3);
    printf("Job 4 finished at t=%d (first ran at t=%d)\n",
        job_list[3].end_time, starved_start_4);
}

// 3. Run the same workload with Rule 5 off, then on, and compare
int main() {
    printf("=== No boost rule 5 disabled (boost_period = 0) ===\n");
    run_mlfq(0);

    printf("\n=== Boost every 30 tickets rule 5 enabled (boost_period = 30) ===\n");
    run_mlfq(30);

    return 0;
}
