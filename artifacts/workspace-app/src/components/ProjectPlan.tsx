import React from "react";
import { 
  useGetPlan, 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  useResetPlan,
  getGetPlanQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";

export default function ProjectPlan() {
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = useGetPlan({
    query: { refetchInterval: 5000, queryKey: getGetPlanQueryKey() }
  });

  const resetPlan = useResetPlan();
  
  const handleReset = () => {
    if (confirm("Are you sure you want to reset the entire project plan? This cannot be undone.")) {
      resetPlan.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey() });
        }
      });
    }
  };

  if (isLoading || !plan) {
    return <div className="h-64 animate-pulse bg-muted rounded-none" />;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h2 className="text-xs font-bold uppercase text-primary tracking-widest">
            3. 3-Week Project Plan
          </h2>
          <div className="flex items-center gap-4">
            <Progress 
              value={plan.percentComplete} 
              className="h-3 flex-1 rounded-none bg-muted [&>div]:bg-primary" 
            />
            <span className="font-bold text-lg min-w-[3rem] text-right">
              {Math.round(plan.percentComplete)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex gap-4 text-muted-foreground">
            {plan.weeks.map(w => (
              <span key={w.number}>W{w.number}: {w.doneCount}/{w.totalCount}</span>
            ))}
          </div>
          <Button 
            variant="outline" 
            onClick={handleReset} 
            disabled={resetPlan.isPending}
            className="uppercase font-bold text-xs rounded-none border-border"
          >
            RESET PLAN
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {plan.weeks.map(week => (
          <WeekBlock key={week.number} week={week} />
        ))}
      </div>
    </section>
  );
}

function WeekBlock({ week }: { week: any }) {
  const queryClient = useQueryClient();
  const createTask = useCreateTask();

  const handleAddTask = () => {
    createTask.mutate(
      { data: { weekNumber: week.number, name: "", owner: "", targetDate: "" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey() });
        }
      }
    );
  };

  return (
    <div className="border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-xl font-bold uppercase text-foreground">{week.title}</h3>
            <span className="text-sm text-muted-foreground font-medium">{week.dateRange}</span>
          </div>
          <p className="text-sm font-bold text-primary uppercase mt-1">{week.theme}</p>
        </div>
        <Button 
          onClick={handleAddTask} 
          disabled={createTask.isPending}
          variant="secondary"
          className="uppercase font-bold rounded-none"
        >
          + ADD TASK
        </Button>
      </div>
      
      <div className="space-y-3">
        {week.tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground italic py-4">No tasks added yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[auto_1fr_150px_150px_auto] gap-4 px-3 py-2 text-xs font-bold uppercase text-muted-foreground">
              <div className="w-5"></div>
              <div>Task Name</div>
              <div>Owner</div>
              <div>Target Date</div>
              <div className="w-8"></div>
            </div>
            {week.tasks.map((task: any) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleUpdate = (field: string, value: any) => {
    updateTask.mutate(
      { id: task.id, data: { [field]: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey() });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPlanQueryKey() });
      }
    });
  };

  return (
    <div className="grid grid-cols-[auto_1fr_150px_150px_auto] gap-4 items-center bg-background border border-border p-2">
      <div className="w-5 flex justify-center">
        <Checkbox 
          checked={task.done} 
          onCheckedChange={(c) => handleUpdate("done", c === true)}
          className="rounded-none border-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </div>
      <Input 
        value={task.name || ""} 
        onChange={(e) => handleUpdate("name", e.target.value)}
        placeholder="Task name"
        className="h-8 rounded-none border-transparent hover:border-input focus-visible:border-input shadow-none bg-transparent font-medium"
      />
      <Input 
        value={task.owner || ""} 
        onChange={(e) => handleUpdate("owner", e.target.value)}
        placeholder="Owner"
        className="h-8 rounded-none border-transparent hover:border-input focus-visible:border-input shadow-none bg-transparent text-sm"
      />
      <Input 
        type="date"
        value={task.targetDate || ""} 
        onChange={(e) => handleUpdate("targetDate", e.target.value)}
        className="h-8 rounded-none border-transparent hover:border-input focus-visible:border-input shadow-none bg-transparent text-sm"
      />
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={handleDelete}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none"
        title="Delete task"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
      </Button>
    </div>
  );
}
