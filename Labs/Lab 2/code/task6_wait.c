            else // after creating all 3 children
            {
                int wc1 = waitpid(return_child, NULL, 0);
                int wc2 = waitpid(return_child2, NULL, 0);
                int wc3 = waitpid(return_child3, NULL, 0);
                int proc_id = (int) getpid();
                printf("[pid:%d] I am parent of [%d] [%d] [%d] [wc1:%d] [wc2:%d] [wc3:%d] \n",
                       proc_id, return_child, return_child2, return_child3, wc1, wc2, wc3);
            }
