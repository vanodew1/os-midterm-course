#include <stdio.h>

struct job{
    char name;
    int arrival;
    int length;
    int remaining;
    int start_time;
    int completion_time;
    int finished;
};

void simulate_stcf(struct job jobs[], int job_count){
    int current_time = 0;
    int completed = 0;
    int last_index = -1;
    //keep repeating until every process done
    while(completed < job_count){
        int chosen = -1;
        for (int i = 0; i <job_count; i++){
            if (jobs[i].arrival <= current_time && !jobs[i].finished){
                if(chosen == -1 || jobs[i].remaining < jobs[chosen].remaining){
                    chosen = i;
                }
            }
        }
        //did prev process change
        if (chosen != last_index){
            //process changed preempted outputted
            if (last_index != -1 && !jobs[last_index].finished){
                printf("Time %d: Job %c preempted (remaining %d)\n",
                    current_time, jobs[last_index].name, jobs[last_index].remaining);
            }
            // if -1 process just started, if not -1 then process continue
            if (jobs[chosen].start_time == -1){
                jobs[chosen].start_time = current_time;
                printf("Time %d: Job %c starts\n", current_time, jobs[chosen].name);
            } 
            else{
                printf("Time %d: Job %c resumes (remaining: %d)\n",
                    current_time, jobs[chosen].name, jobs[chosen].remaining);
            }
        }
        // time go up job time go down
        jobs[chosen].remaining--;
        current_time++;

        //if process done then completed
        if (jobs[chosen].remaining == 0){
            jobs[chosen].finished = 1;
            jobs[chosen].completion_time = current_time;
            completed++;
            printf("Time %d: Job %c completes\n", current_time, jobs[chosen].name);
        }
        //marks which process was last one worked on
        last_index = chosen;
    }

}



void calculate_metrics(struct job jobs[], int job_count){
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
    struct job jobs[] =
    {
        {'A', 0, 100, 100, -1, 0, 0},
        {'B', 10, 10, 10, -1, 0, 0},
        {'C', 10, 10, 10, -1, 0, 0}
    };
    simulate_stcf(jobs,3);
    calculate_metrics(jobs,3);
    return 0;
}