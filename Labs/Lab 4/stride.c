#include <stdio.h>
#define NUMERATOR 10000

// 1. Structure of a Stride Process
typedef struct {
    int pid;
    int burst_time;
    int remaining_time;
    int tickets;
    int stride;
    int pass;
} StrideProcess;

//Sample Initialization: The identical workload used in lottery
StrideProcess sample_stride_jobs[] = {
    {1,5,5,100,0,0},
    {2,5,5,50,0,0},
    {3,5,5,10,0,0}
};
//Notice, the differences in ticket allocation are marked in red.

// 2. Scheduler Logic
void run_stride(StrideProcess jobs[], int num_jobs){
    int completed = 0;

    // Initialize strides
    for (int i = 0; i < num_jobs; i++) {
        jobs[i].stride = NUMERATOR /jobs[i].tickets;
        jobs[i].pass = 0;
    }

    //Print Stride Values;
    printf("Stride %d \t| Stride %d \t| Stride %d \t\n",
        jobs[0].stride, jobs[1].stride, jobs[2].stride);

    // Print the dynamic header (Pass A | Pass B | Pass C | Run)

    for (int i=0; i <num_jobs; i++) {
        printf("Pass %c \t|", 'A' + jobs[i].pid - 1);
    }

    printf("Run\n");
    printf("-----------------------------------------\n");

    while (completed < num_jobs){
        int min_pass_index = -1;

        // Find the active process with the lowest pass value
        for (int i=0; i <num_jobs; i++) {
            if (jobs[i].remaining_time > 0){
                if(min_pass_index == -1 || jobs[i].pass <
                    jobs[min_pass_index].pass)
                    min_pass_index = i;
            }
        }
        //Print the current pass values for all jobs
        for (int i=0;i<num_jobs;i++){
            printf(" %-11d \t|", jobs[i].pass);
        }
        //Print the winning process (converting PID 1->A, ..., 3->C)
        printf("%c\n", 'A'+jobs[min_pass_index].pid -1);

        //Advance the winner
        jobs[min_pass_index].remaining_time--;
        jobs[min_pass_index].pass += jobs[min_pass_index].stride;

        if (jobs[min_pass_index].remaining_time == 0)
        completed++;
    }
}

int main(){
    int num_jobs = sizeof(sample_stride_jobs) / sizeof(StrideProcess);
    run_stride(sample_stride_jobs, num_jobs);
    return 0;
}