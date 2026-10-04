#include <stdio.h>
#include <stdlib.h>
#include <time.h>

//1. Structure of a Lottery Process
typedef struct {
    int pid;
    int burst_time;
    int remaining_time;
    int tickets;
} Process;

//Sample Initialization: Note how PID 1 holds the vast majority of tickets

Process sample_lottery_jobs[] = {
    {1,5,5,60}, //PID 1: 5ms burst, 60 tickets(High Priority) 
    {2,5,5,30}, //PID 2: 5ms burst, 30 tickets (Medium Priority)
    {3,5,5,10}  //PID 3: 5ms burst, 10 tickets (Low Priority)
};

// 2. Scheduler Logic
void run_lottery(Process jobs[], int num_jobs){
    int total_tickets = 0;
    for (int i = 0; i < num_jobs; i++) total_tickets += jobs[i].tickets;

    srand(time(NULL));
    int completed = 0;

    while (completed < num_jobs){
        int winning_ticket = rand() % total_tickets;
        int ticket_count = 0;

        for (int i = 0; i <num_jobs; i++){
            if (jobs[i].remaining_time > 0){
                ticket_count += jobs[i].tickets;
                if (winning_ticket < ticket_count) {
                    printf("Winning Ticket: %d | Process %d runs!\n",
                        winning_ticket, jobs[i].pid);
                    jobs[i].remaining_time--;

                    if (jobs[i].remaining_time == 0){
                        completed++;
                        total_tickets -= jobs[i].tickets;
                    }
                    break;
                }
            }
        }
    }
}

int main(){
    int num_jobs = sizeof(sample_lottery_jobs) / sizeof(Process);
    run_lottery(sample_lottery_jobs, num_jobs);
    return 0;
}
