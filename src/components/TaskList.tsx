"use client";

import type { Task, TaskPriority } from "@/types/task";

type TaskFilter = "all" | "active" | "done";

type TaskListProps = {
  tasks: Task[];
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onToggleComplete: (task: Task) => void;
  onRefresh: () => void;
  updatingTaskId: string | null;
  isRefreshing: boolean;
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "border-red-400/40 bg-red-500/10 text-red-300",
  medium: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  low: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
};

function formatDueDate(dueDate: string) {
  if (!dueDate || dueDate === "unknown") {
    return "No due date";
  }

  const parsed = new Date(`${dueDate}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dueDate;
  }

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function filterTasks(tasks: Task[], filter: TaskFilter) {
  if (filter === "active") {
    return tasks.filter((task) => task.status === "pending");
  }

  if (filter === "done") {
    return tasks.filter((task) => task.status === "completed");
  }

  return tasks;
}

export function TaskList({
  tasks,
  filter,
  onFilterChange,
  onToggleComplete,
  onRefresh,
  updatingTaskId,
  isRefreshing,
}: TaskListProps) {
  const activeCount = tasks.filter((task) => task.status === "pending").length;
  const doneCount = tasks.filter((task) => task.status === "completed").length;
  const visibleTasks = filterTasks(tasks, filter);

  const filters: { id: TaskFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: tasks.length },
    { id: "active", label: "Active", count: activeCount },
    { id: "done", label: "Done", count: doneCount },
  ];

  return (
    <section className="sb-panel flex h-full min-h-[520px] flex-col">
      <header className="border-b border-[var(--sb-border)] px-5 py-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="sb-label">Your list</p>
            <h2 className="text-lg font-bold text-[var(--sb-text)]">My Tasks</h2>
            <p className="mt-1 font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-[var(--sb-text-muted)]">
              {activeCount} active · {doneCount} completed
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="sb-btn-outline px-3 py-1.5 disabled:opacity-50"
          >
            {isRefreshing ? "..." : "Refresh"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`px-3 py-1.5 font-[family-name:var(--font-mono)] text-[0.6875rem] font-bold uppercase tracking-wider transition ${
                filter === item.id
                  ? "bg-[var(--sb-cyan)] text-[#071018]"
                  : "border border-[var(--sb-border)] text-[var(--sb-text-muted)] hover:border-[var(--sb-cyan)] hover:text-[var(--sb-cyan)]"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {visibleTasks.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center border border-dashed border-[var(--sb-border)] px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center border border-[var(--sb-border-strong)] bg-[var(--sb-cyan-dim)]">
              <span className="font-[family-name:var(--font-mono)] text-xl text-[var(--sb-cyan)]">
                //
              </span>
            </div>
            <p className="mt-4 font-bold text-[var(--sb-text)]">
              {filter === "done"
                ? "No completed tasks yet"
                : filter === "active"
                  ? "You're all caught up"
                  : "Your list is empty"}
            </p>
            <p className="mt-2 max-w-xs text-sm text-[var(--sb-text-muted)]">
              Tell the assistant to add a task, or say something like &quot;Add
              study for midterm on Thursday&quot;
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isDone = task.status === "completed";
            const isUpdating = updatingTaskId === task.taskId;

            return (
              <article
                key={task.taskId}
                className={`sb-stat-card p-4 transition ${
                  isDone ? "opacity-70" : "hover:border-[var(--sb-border-strong)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(task)}
                    disabled={isUpdating}
                    aria-label={
                      isDone
                        ? `Mark "${task.title}" as active`
                        : `Mark "${task.title}" as done`
                    }
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition disabled:opacity-50 ${
                      isDone
                        ? "border-[var(--sb-cyan)] bg-[var(--sb-cyan)] text-[#071018]"
                        : "border-[var(--sb-border-strong)] bg-transparent hover:border-[var(--sb-cyan)]"
                    }`}
                  >
                    {isDone && (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-3 w-3"
                        fill="currentColor"
                      >
                        <path d="M10.28 2.28a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 0 1-1.06 0L1.72 6.34a.75.75 0 1 1 1.06-1.06L4.5 6.5l4.75-4.75a.75.75 0 0 1 1.03 0Z" />
                      </svg>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-bold text-[var(--sb-text)] ${
                          isDone
                            ? "text-[var(--sb-text-muted)] line-through"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      <span
                        className={`border px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-wide text-[var(--sb-text-muted)]">
                      <span>{formatDueDate(task.dueDate)}</span>
                      <span>{task.category}</span>
                      <span>{task.status}</span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <footer className="border-t border-[var(--sb-border)] px-5 py-3 font-[family-name:var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--sb-text-muted)]">
        Check tasks here or tell the agent in chat — both stay in sync
      </footer>
    </section>
  );
}
