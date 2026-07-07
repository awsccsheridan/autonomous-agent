"use client";

import { useEffect, useState } from "react";

type Task = {
  taskId: string;
  title: string;
  dueDate: string;
  category: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "completed";
  originalRequest: string;
  createdAt: string;
};

const SESSION_STORAGE_KEY = "task-agent-session-id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [agentMessage, setAgentMessage] = useState(
    "Hi! I'm your Bedrock Agent. Tell me a task in plain English, ask to list tasks, or mark one complete."
  );
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  async function loadTasks() {
    if (!apiUrl) return;

    const response = await fetch(`${apiUrl}/tasks`);
    const data = await response.json();

    setTasks(data.tasks || []);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    if (!apiUrl) {
      setAgentMessage("Missing NEXT_PUBLIC_API_URL. Please check .env.local.");
      return;
    }

    setIsLoading(true);
    setAgentMessage("Agent is thinking and deciding what to do...");

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          sessionId: sessionId || getOrCreateSessionId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Something went wrong");
      }

      if (data.sessionId) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
        setSessionId(data.sessionId);
      }

      setAgentMessage(data.message || "Done.");
      setInput("");
      await loadTasks();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown frontend error";

      setAgentMessage(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    loadTasks();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
            AWS Workshop Project
          </p>

          <h1 className="mb-4 text-4xl font-bold md:text-6xl">
            Build Your First Autonomous AI Agent
          </h1>

          <p className="max-w-3xl text-lg text-slate-300">
            Chat with an Amazon Bedrock Agent. It understands natural language,
            chooses the right tools, stores tasks in DynamoDB, and updates your
            dashboard.
          </p>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-6 rounded-2xl bg-cyan-400/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
                Bedrock Agent
              </p>
              <p className="mt-3 text-lg text-slate-100">{agentMessage}</p>
            </div>

            <label className="mb-3 block text-sm font-medium text-slate-300">
              Message the agent
            </label>

            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: Add assignment due on June 25 for Digital Principles"
              className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-slate-950 p-4 text-white outline-none transition focus:border-cyan-400"
            />

            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="mt-4 w-full rounded-2xl bg-cyan-400 px-5 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Agent is working..." : "Send to Bedrock Agent"}
            </button>

            <div className="mt-6 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                Orchestrates with Bedrock Agent
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                Calls action group tools
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                Stores tasks in DynamoDB
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
                  Dashboard
                </p>
                <h2 className="text-2xl font-bold">Created Tasks</h2>
              </div>

              <button
                onClick={loadTasks}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
                  No tasks yet. Ask the Bedrock Agent to create your first task.
                </div>
              ) : (
                tasks.map((task) => (
                  <article
                    key={task.taskId}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          task.priority === "high"
                            ? "bg-red-400/20 text-red-200"
                            : task.priority === "low"
                              ? "bg-green-400/20 text-green-200"
                              : "bg-yellow-400/20 text-yellow-200"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-300">
                      <p>
                        <span className="text-slate-500">Due date:</span>{" "}
                        {task.dueDate}
                      </p>
                      <p>
                        <span className="text-slate-500">Category:</span>{" "}
                        {task.category}
                      </p>
                      <p>
                        <span className="text-slate-500">Status:</span>{" "}
                        {task.status}
                      </p>
                    </div>

                    <p className="mt-4 rounded-xl bg-slate-950/60 p-3 text-sm text-slate-400">
                      Original: {task.originalRequest}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
