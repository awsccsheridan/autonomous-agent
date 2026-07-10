"use client";

import type { Task, TaskPriority } from "@/types/task";

type TaskFilter = "all" | "active" | "done";

type TaskListProps = {
  tasks: Task[];
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
  updatingTaskId: string | null;
  isRefreshing: boolean;
  completionPercent: number;
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
  onDelete,
  onRefresh,
  updatingTaskId,
  isRefreshing,
  completionPercent,
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
    <section className="sb-panel flex h-full min-h-0 flex-col rounded-[2rem]">
      <header className="border-b border-[var(--sb-border)] px-5 py-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="sb-label">DynamoDB task dashboard</p>
            <h2 className="text-base font-bold text-[var(--sb-text)]">My Tasks</h2>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="sb-btn-outline rounded-xl px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {isRefreshing ? "Syncing" : "Refresh"}
          </button>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--sb-cyan)] transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-xs text-[var(--sb-cyan)]">
            {completionPercent}%
          </span>
          <span className="text-xs text-[var(--sb-text-muted)]">
            {activeCount} active · {doneCount} done
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`rounded-lg px-2.5 py-1 font-[family-name:var(--font-mono)] text-[0.6875rem] font-bold uppercase tracking-wider transition ${
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
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--sb-border)] px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--sb-border-strong)] bg-[var(--sb-cyan-dim)]">
              <span className="font-[family-name:var(--font-mono)] text-xl text-[var(--sb-cyan)]">
                AI
              </span>
            </div>

            <p className="mt-4 font-bold text-[var(--sb-text)]">
              {filter === "done"
                ? "No completed tasks yet"
                : filter === "active"
                  ? "No active tasks"
                  : "Your task list is empty"}
            </p>

            <p className="mt-2 max-w-xs text-sm text-[var(--sb-text-muted)]">
              Ask the agent to add a task, then it will appear here after being
              stored in DynamoDB.
            </p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const isDone = task.status === "completed";
            const isUpdating = updatingTaskId === task.taskId;

            return (
              <article
                key={task.taskId}
                className={`sb-stat-card relative rounded-3xl p-4 transition ${
                  isDone ? "opacity-70" : "hover:border-[var(--sb-border-strong)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onDelete(task)}
                  disabled={isUpdating}
                  aria-label={`Delete "${task.title}"`}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-lg text-[var(--sb-text-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 group-hover:opacity-100 [article:hover_&]:opacity-100"
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                    <path d="M2 2.5A.5.5 0 0 1 2.5 2h7a.5.5 0 0 1 0 1H9v6.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3H2.5A.5.5 0 0 1 2 2.5ZM4 3v6.5h4V3H4Zm1-1.5h2v.5H5V1.5Z" />
                  </svg>
                </button>

                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => onToggleComplete(task)}
                    disabled={isUpdating}
                    aria-label={
                      isDone
                        ? `Mark "${task.title}" as active`
                        : `Mark "${task.title}" as done`
                    }
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition disabled:opacity-50 ${
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
                        className={`text-base font-bold text-[var(--sb-text)] ${
                          isDone
                            ? "text-[var(--sb-text-muted)] line-through"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h3>

                      <span
                        className={`rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wide ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-[var(--sb-text-muted)] sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/5 px-3 py-2">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider opacity-70">
                          Due
                        </p>
                        <p className="font-semibold text-[var(--sb-text)]">
                          {formatDueDate(task.dueDate)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/5 px-3 py-2">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider opacity-70">
                          Category
                        </p>
                        <p className="font-semibold text-[var(--sb-text)]">
                          {task.category}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/5 px-3 py-2">
                        <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider opacity-70">
                          Status
                        </p>
                        <p className="font-semibold text-[var(--sb-text)]">
                          {isUpdating ? "Updating..." : task.status}
                        </p>
                      </div>
                    </div>

                    {task.originalRequest && (
                      <p className="mt-3 rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--sb-text-muted)]">
                        Original request: {task.originalRequest}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <footer className="border-t border-[var(--sb-border)] px-5 py-4 text-xs text-[var(--sb-text-muted)]">
        You can update tasks by clicking the checkbox or by chatting with the
        Bedrock Agent.
      </footer>
    </section>
  );
}