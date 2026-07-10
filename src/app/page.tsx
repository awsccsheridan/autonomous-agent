"use client";

//import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { fetchTasks, normalizeApiUrl } from "@/lib/api";
import type { Task } from "@/types/task";

function isDueToday(task: Task) {
  if (!task.dueDate || task.dueDate === "unknown") return false;

  const today = new Date().toISOString().split("T")[0];
  return task.dueDate === today && task.status !== "completed";
}

function ProgressCircle({ percent }: { percent: number }) {
  const radius = 56;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="rgba(255,255,255,0.12)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--sb-cyan)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-700"
        />
      </svg>

      <div className="absolute text-center">
        <p className="text-3xl font-bold text-[var(--sb-text)]">{percent}%</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sb-text-muted)]">
          Complete
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(apiUrl));

  const activeTasks = tasks.filter((task) => task.status === "pending");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const dueTodayTasks = tasks.filter(isDueToday);

  const completionPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks.length / tasks.length) * 100);
  }, [completedTasks.length, tasks.length]);

  useEffect(() => {
    if (!apiUrl) return;

    let cancelled = false;

    fetchTasks(apiUrl)
      .then((nextTasks) => {
        if (!cancelled) setTasks(nextTasks);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none fixed left-1/2 top-[-240px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[var(--sb-cyan)]/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-260px] right-[-160px] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-3xl" />

      <SiteHeader />

      <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 py-3 sm:px-6 lg:px-8">
        <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <div className="sb-panel flex min-h-0 flex-col justify-center rounded-[1.75rem] p-5 sm:p-6">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--sb-border)] bg-[var(--sb-cyan-dim)] px-3 py-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--sb-cyan)]" />
              <span className="sb-label">AWS AI Agent Workshop</span>
            </div>

            <h1 className="max-w-4xl text-2xl font-bold leading-tight tracking-tight text-[var(--sb-text)] sm:text-3xl lg:text-4xl">
              Hello, welcome to your AI Task Agent
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--sb-text-muted)] sm:text-base">
              Turn natural language into real actions using AWS. This workshop
              shows how a Bedrock Agent can understand a request, select a tool,
              and manage tasks through a serverless cloud workflow.
            </p>

            <blockquote className="mt-4 rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-4">
              <p className="text-base font-semibold text-[var(--sb-text)] sm:text-lg">
                “Don’t just ask AI for answers - teach it to take useful
                actions.”
              </p>
              <p className="mt-1 text-xs text-[var(--sb-text-muted)] sm:text-sm">
                In this project, the agent creates, lists, and updates tasks by
                using backend tools.
              </p>
            </blockquote>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            <div className="sb-panel flex min-h-0 flex-1 flex-col rounded-[1.75rem] p-4 sm:p-5">
              <p className="sb-label">Today&apos;s summary</p>

              <div className="mt-3 flex flex-1 flex-col gap-4">
                <div className="flex justify-center">
                  <ProgressCircle percent={isLoading ? 0 : completionPercent} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="sb-stat-card rounded-xl p-3">
                    <p className="text-xs text-[var(--sb-text-muted)]">Active</p>
                    <p className="mt-0.5 text-2xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : activeTasks.length}
                    </p>
                    <p className="text-[10px] text-[var(--sb-text-muted)]">
                      Still pending
                    </p>
                  </div>

                  <div className="sb-stat-card rounded-xl p-3">
                    <p className="text-xs text-[var(--sb-text-muted)]">Completed</p>
                    <p className="mt-0.5 text-2xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : completedTasks.length}
                    </p>
                    <p className="text-[10px] text-[var(--sb-text-muted)]">
                      Finished tasks
                    </p>
                  </div>

                  <div className="sb-stat-card rounded-xl p-3">
                    <p className="text-xs text-[var(--sb-text-muted)]">Total</p>
                    <p className="mt-0.5 text-2xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : tasks.length}
                    </p>
                    <p className="text-[10px] text-[var(--sb-text-muted)]">
                      All tasks
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-[var(--sb-border)] pt-3">
                <p className="sb-label">Reminder</p>

                {dueTodayTasks.length > 0 ? (
                  <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
                    <p className="text-sm font-bold text-amber-200">
                      You have {dueTodayTasks.length} task
                      {dueTodayTasks.length > 1 ? "s" : ""} due today.
                    </p>

                    <div className="mt-2 space-y-1">
                      {dueTodayTasks.slice(0, 2).map((task) => (
                        <p
                          key={task.taskId}
                          className="rounded-lg bg-black/20 px-2.5 py-1.5 text-xs text-[var(--sb-text)]"
                        >
                          {task.title}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--sb-text-muted)] sm:text-sm">
                    No urgent task due today. Open the workspace to create tasks
                    or ask the agent what is on your list.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-3 grid shrink-0 gap-2 md:grid-cols-3">
          <div className="sb-panel rounded-2xl p-4">
            <p className="sb-label">Step 1</p>
            <h2 className="mt-1 text-base font-bold text-[var(--sb-text)]">
              Chat naturally
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--sb-text-muted)]">
              Type requests like “Add a high priority task to finish README by
              Friday.”
            </p>
          </div>

          <div className="sb-panel rounded-2xl p-4">
            <p className="sb-label">Step 2</p>
            <h2 className="mt-1 text-base font-bold text-[var(--sb-text)]">
              Agent chooses a tool
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--sb-text-muted)]">
              Amazon Bedrock Agent decides whether to create, list, or update a
              task.
            </p>
          </div>

          <div className="sb-panel rounded-2xl p-4">
            <p className="sb-label">Step 3</p>
            <h2 className="mt-1 text-base font-bold text-[var(--sb-text)]">
              Store in DynamoDB
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--sb-text-muted)]">
              The action group Lambda performs the task operation and saves data
              in DynamoDB.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}