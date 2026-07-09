"use client";

import Link from "next/link";
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
  const radius = 58;
  const stroke = 12;
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
  const [isLoading, setIsLoading] = useState(false);

  const activeTasks = tasks.filter((task) => task.status === "pending");
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const dueTodayTasks = tasks.filter(isDueToday);

  const completionPercent = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedTasks.length / tasks.length) * 100);
  }, [completedTasks.length, tasks.length]);

  useEffect(() => {
    async function loadOverview() {
      if (!apiUrl) return;

      setIsLoading(true);

      try {
        const nextTasks = await fetchTasks(apiUrl);
        setTasks(nextTasks);
      } catch {
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadOverview();
  }, [apiUrl]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-[-240px] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[var(--sb-cyan)]/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-260px] right-[-160px] h-[520px] w-[520px] rounded-full bg-blue-500/10 blur-3xl" />

      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="sb-panel rounded-[2rem] p-7 sm:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--sb-border)] bg-[var(--sb-cyan-dim)] px-4 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--sb-cyan)]" />
              <span className="sb-label">AWS AI Agent Workshop</span>
            </div>

            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-[var(--sb-text)] sm:text-5xl lg:text-6xl">
              Hello, welcome to your AI Task Agent
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--sb-text-muted)]">
              Turn natural language into real actions using AWS. This workshop
              shows how a Bedrock Agent can understand a request, select a tool,
              and manage tasks through a serverless cloud workflow.
            </p>

            <blockquote className="mt-7 rounded-3xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-5">
              <p className="text-xl font-semibold text-[var(--sb-text)]">
                “Don’t just ask AI for answers — teach it to take useful
                actions.”
              </p>
              <p className="mt-2 text-sm text-[var(--sb-text-muted)]">
                In this project, the agent creates, lists, and updates tasks by
                using backend tools.
              </p>
            </blockquote>

          </div>

          <aside className="space-y-5">
            <div className="sb-panel rounded-[2rem] p-6">
              <p className="sb-label">Today&apos;s summary</p>

              <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-center">
                <ProgressCircle percent={isLoading ? 0 : completionPercent} />

                <div className="grid flex-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="sb-stat-card rounded-2xl p-4">
                    <p className="text-sm text-[var(--sb-text-muted)]">Active</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : activeTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
                      Still pending
                    </p>
                  </div>

                  <div className="sb-stat-card rounded-2xl p-4">
                    <p className="text-sm text-[var(--sb-text-muted)]">Completed</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : completedTasks.length}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
                      Finished tasks
                    </p>
                  </div>

                  <div className="sb-stat-card rounded-2xl p-4">
                    <p className="text-sm text-[var(--sb-text-muted)]">Total</p>
                    <p className="mt-1 text-3xl font-bold text-[var(--sb-text)]">
                      {isLoading ? "..." : tasks.length}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sb-text-muted)]">
                      All tasks
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-[var(--sb-text)]">
                    Overall completion
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[var(--sb-cyan)]">
                    {completionPercent}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--sb-cyan)] transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="sb-panel rounded-[2rem] p-6">
              <p className="sb-label">Reminder</p>

              {dueTodayTasks.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                  <p className="font-bold text-amber-200">
                    You have {dueTodayTasks.length} task
                    {dueTodayTasks.length > 1 ? "s" : ""} due today.
                  </p>

                  <div className="mt-3 space-y-2">
                    {dueTodayTasks.slice(0, 3).map((task) => (
                      <p
                        key={task.taskId}
                        className="rounded-xl bg-black/20 px-3 py-2 text-sm text-[var(--sb-text)]"
                      >
                        {task.title}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] p-4">
                  <p className="font-bold text-[var(--sb-text)]">
                    No urgent task due today.
                  </p>
                  <p className="mt-1 text-sm text-[var(--sb-text-muted)]">
                    Open the workspace to create tasks or ask the agent what is
                    on your list.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="sb-panel rounded-3xl p-6">
            <p className="sb-label">Step 1</p>
            <h2 className="mt-3 text-xl font-bold text-[var(--sb-text)]">
              Chat naturally
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--sb-text-muted)]">
              Type requests like “Add a high priority task to finish README by
              Friday.”
            </p>
          </div>

          <div className="sb-panel rounded-3xl p-6">
            <p className="sb-label">Step 2</p>
            <h2 className="mt-3 text-xl font-bold text-[var(--sb-text)]">
              Agent chooses a tool
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--sb-text-muted)]">
              Amazon Bedrock Agent decides whether to create, list, or update a
              task.
            </p>
          </div>

          <div className="sb-panel rounded-3xl p-6">
            <p className="sb-label">Step 3</p>
            <h2 className="mt-3 text-xl font-bold text-[var(--sb-text)]">
              Store in DynamoDB
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--sb-text-muted)]">
              The action group Lambda performs the task operation and saves data
              in DynamoDB.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}