#include <stdio.h>
#include <stdlib.h>

// --- SCHEDULER CONFIGURATION ---
#define MAX_JOBS 10
#define Q_LEVELS 3
#define RR_TIME_SLICE 1 // Now, Round Robin is undeniable
#define BOOST_TIME 15   // Priority boost triggers every 15 ticks

typedef struct {
    int id;
    int arrival_time;
    int burst_time;
    int remaining_time;
    int current_queue;
    int first_run;
    int end_time;
    int allot_left;
    int done;
} Job;

//Note: Job 3 is a massive, CPU-bound nightmare.
Job sample_mlfq_jobs[] = {
    {1,0,4,4,0,-1,0,0,0},   //Job 1: Short interactive
    {2,0,5,5,0,-1,0,0,0},   //Job 2: Short interactive
    {3,0,30,30,0,-1,0,0,0}  //Job 3: Massive CPU-bound
};

// Queues
int queue[Q_LEVELS][MAX_JOBS];
int q_len[Q_LEVELS] = {0};

void enqueue(int q_level, int job_index) {
    queue[q_level][q_len[q_level]] = job_index;
    q_len[q_level]++;
}

int dequeue(int q_level) {
    if (q_len[q_level] == 0)
        return -1;

    int job_index = queue[q_level][0];

    for (int i = 1; i < q_len[q_level]; i++) {
        queue[q_level][i - 1] = queue[q_level][i];
    }

    q_len[q_level]--;

    return job_index;
}

//2. Scheduler Logic

// RULE 6: Different quanta for different queues, incorporated as
//  int quanta[] (within the arguments)

void run_mlfq(Job jobs[], int num_jobs, int quanta[], const char* label) {
    int curr_time = 0;
    int completed = 0;
    int current_job_index = -1;
    int slice_used = 0;
    int lowest_q_switches = 0;

    for (int i = 0; i < Q_LEVELS; i++) q_len[i] = 0;

    // RULE 3: Everyone starts at the top of the ladder (Q0)

    for (int i = 0; i < num_jobs; i++) {
        jobs[i].current_queue = 0;
        jobs[i].allot_left = quanta[0];
        enqueue(0,i);
    }
    // Some printout statement for improved visibility
    printf("\n===========================================\n");
    printf(" %s\n", label);
    printf("===========================================\n");
    printf("%-7s | %-9s | %-9s | %-9s\n", "Run", "Q1", "Q2", "Q3");
    printf("-------------------------------------------\n");

    while (completed < num_jobs) {

        // RULE 5: (Priority Boost): After some time period S
        // (BOOST_TIME), move all jobs in to the topmost queue.

        if(BOOST_TIME >0 && curr_time >0 && curr_time % BOOST_TIME ==0) {
            if(current_job_index != -1){
                jobs[current_job_index].current_queue = 0;
                jobs[current_job_index].allot_left = quanta[0];
                enqueue(0, current_job_index);
                current_job_index = -1;
            }
            for (int q=1; q<Q_LEVELS; q++){
                while (q_len[q] > 0){
                    int j_idx = dequeue(q);
                    jobs[j_idx].current_queue = 0;
                    jobs[j_idx].allot_left = quanta[0];
                    enqueue(0,j_idx);
                }
            }
            printf("------| PRIORITY BOOST APPLIED |------\n");
        }

        //RULE 1: If Priority(A) > Priority(B), A runs.

        if (current_job_index != -1){
            int active_q = jobs[current_job_index].current_queue;
            int preempt = 0;
            for (int q = 0; q< active_q; q++){
                if(q_len[q] > 0) {
                    preempt = 1;
                    break;
                }
            }
            if (preempt) {
                enqueue(active_q, current_job_index);
                current_job_index = -1;
            }
        }

        //Find the absolute highest-prioirty job waiting to work

        if (current_job_index == -1){
            for (int q = 0; q<Q_LEVELS;q++){
                if(q_len[q] > 0){
                    current_job_index = dequeue(q);
                    slice_used = 0; // Reset consecutive RR slices

                    if(jobs[current_job_index].id ==3 && q == Q_LEVELS - 1)
                    lowest_q_switches++;    //Tracking metrics
                    break;
                }
            }
        }

    // Execute the chosen job for 1 tick
    if (current_job_index != -1) {
        if(jobs[current_job_index].first_run == -1){
            jobs[current_job_index].first_run = curr_time;
        }

        int q = jobs[current_job_index].current_queue;
        int id = jobs[current_job_index].id;

        //Print the visual trace line
        printf("%-7d | ", curr_time + 1);
        if (q == 0) printf("%-9d | %-9s | %-9s\n", id, "", "");
        else if (q == 1) printf("%-9s | %-9d | %-9s\n", "", id, "");
        else if (q == 2) printf("%-9s | %-9s | %-9d\n", "", "", id);

        jobs[current_job_index].remaining_time--;
        jobs[current_job_index].allot_left--;
        slice_used++;

        // Job fully completed its total burst time
        if (jobs[current_job_index].remaining_time == 0) {
            jobs[current_job_index].end_time = curr_time + 1;
            jobs[current_job_index].done = 1;
            completed++;
            current_job_index = -1;
        }
        //RULE 4: Once a job exhausts its total allotment at a given level
        //its priority is reduced.

        else if (jobs[current_job_index].allot_left <= 0) {
            int next_q=jobs[current_job_index].current_queue+ 1;
            if (next_q >= Q_LEVELS) next_q = Q_LEVELS - 1;

            jobs[current_job_index].current_queue = next_q;
            jobs[current_job_index].allot_left = quanta[next_q];
            enqueue(next_q, current_job_index);
            current_job_index = -1;
        }

        // RULE 2: If priority(A) == Priority(B), they run in RR.

        else if (slice_used >= RR_TIME_SLICE) {
            enqueue(jobs[current_job_index].current_queue,
                current_job_index);
            current_job_index = -1;
        }
    }
    curr_time++;
    }
    // Print Final Metrics
printf("\nJob | Turnaround | Response\n");
printf("---------------------------\n");
for (int i = 0; i < num_jobs; i++) {
int tat = jobs[i].end_time - jobs[i].arrival_time;
int rt = jobs[i].first_run - jobs[i].arrival_time;
printf(" %d | %10d | %8d\n", jobs[i].id, tat, rt);
}
printf("\nTotal Context Switches for Job 3 in Q3: %d\n", lowest_q_switches);
}

int main() {
    int quanta1[] = {3, 3, 3};
    int quanta2[] = {3, 6, 12};

    Job mlfq1_jobs[MAX_JOBS];
    Job mlfq2_jobs[MAX_JOBS];
    for (int i = 0; i < 3; i++) {
        mlfq1_jobs[i] = sample_mlfq_jobs[i];
        mlfq2_jobs[i] = sample_mlfq_jobs[i];
    }

    run_mlfq(mlfq1_jobs, 3, quanta1, "MLFQ1: Quanta (3, 3, 3)");
    run_mlfq(mlfq2_jobs, 3, quanta2, "MLFQ2: Quanta (3, 6, 12)");

    return 0;
}



