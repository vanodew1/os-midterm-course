#include <stdio.h>

struct job {
    char name;
    int arrival;
    int length;
    int start_time;
    int completion_time;
};

double simulate_fifo(struct job jobs[], int job_count)
{
    //FIFO logic here

    int current_time = 0;
    for (int i = 0; i <job_count; i++) {
        jobs[i].start_time = current_time;
        current_time += jobs[i].length;
        jobs[i].completion_time = current_time;
    }
    
    int total_turnaround = 0, total_response = 0;

    for (int i = 0; i <job_count; i++){
        int turnaround = jobs[i].completion_time - jobs[i].arrival;
        int response = jobs[i].start_time - jobs[i].arrival;

        total_turnaround += turnaround;
        total_response += response;

        printf("Job %c: Turnaround = %d, Response = %d\n",
            jobs[i].name, turnaround, response);

    }
    printf("Average Turnaround: %.2f\n", (double)total_turnaround / job_count);
    printf("Average Response: %.2f\n", (double)total_response / job_count);
}

double simulate_sjf(struct job jobs[], int job_count)
{
    //SJF logic here
    for (int i = 0; i < job_count - 1; i++){
        for(int j = i+1; j <job_count; j++){
            if (jobs[j].length < jobs[i].length){
                struct job temp = jobs[i];
                jobs[i] = jobs[j];
                jobs[j] = temp;
            }
        }
    }
    //After sorting, print the execution order to confirm:

    printf("SJF execution order: ");
    for (int i = 0; i< job_count; i++) {
        printf("%c(%d) ", jobs[i].name, jobs[i].length);
    }
    printf("\n");

     int current_time = 0;
    for (int i = 0; i <job_count; i++) {
        jobs[i].start_time = current_time;
        current_time += jobs[i].length;
        jobs[i].completion_time = current_time;
    }
    
    int total_turnaround = 0, total_response = 0;

    for (int i = 0; i <job_count; i++){
        int turnaround = jobs[i].completion_time - jobs[i].arrival;
        int response = jobs[i].start_time - jobs[i].arrival;

        total_turnaround += turnaround;
        total_response += response;

        printf("Job %c: Turnaround = %d, Response = %d\n",
            jobs[i].name, turnaround, response);

    }
    printf("Average Turnaround: %.2f\n", (double)total_turnaround / job_count);
    printf("Average Response: %.2f\n", (double)total_response / job_count);
}


int main(){
    //Initialize job set, run simulations
    struct job jobs[] = {
        {'A',0,10,-1,-1},
        {'B',0,5,-1,-1},
        {'C',0,2,-1,-1}
    };
    simulate_fifo(jobs,3);
    simulate_sjf(jobs,3);
    if (simulate_fifo(jobs,3) > simulate_sjf(jobs,3)){
        printf("fifo produced better avergae turnaround time.");}
    else{
    printf("sjf produced better avergae turnaround time.");
    }
    return 0;
}
