"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { TaskList } from "@/components/TaskList";
import {
  deleteTaskApi,
  fetchTasks,
  normalizeApiUrl,
  sendChatMessage,
  updateTaskApi,
} from "@/lib/api";
import type { ChatMessage, Task } from "@/types/task";

const SESSION_STORAGE_KEY = "task-agent-session-id";

type TaskFilter = "all" | "active" | "done";

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

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    timestamp: Date.now(),
  };
}

export default function WorkspacePage() {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("active");
  const [sessionId, setSessionId] = useState(() =>
    typeof window === "undefined" ? "" : getOrCreateSessionId()
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "agent",
      "Hey! I’m your AI to-do assistant. Add tasks in plain English, ask what’s on your list, or tell me when you’ve finished something - even vaguely, like “I done the homework” - and I’ll figure out which task you mean."
    ),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const completionPercent =
    tasks.length === 0
      ? 0
      : Math.round(
          (tasks.filter((t) => t.status === "completed").length / tasks.length) * 100
        );

  const loadTasks = useCallback(async () => {
    if (!apiUrl) return;

    setIsRefreshing(true);

    try {
      const nextTasks = await fetchTasks(apiUrl);
      setTasks(nextTasks);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load tasks";

      setMessages((current) => [
        ...current,
        createMessage("agent", `Couldn't refresh tasks: ${message}`),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [apiUrl]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || isLoading) return;

    if (!apiUrl) {
      setMessages((current) => [
        ...current,
        createMessage(
          "agent",
          "Missing NEXT_PUBLIC_API_URL. Add your API Gateway URL to .env.local and restart the dev server."
        ),
      ]);
      return;
    }

    setMessages((current) => [...current, createMessage("user", trimmed)]);
    setInput("");
    setIsLoading(true);

    try {
      const activeSessionId = sessionId || getOrCreateSessionId();
      const data = await sendChatMessage(apiUrl, trimmed, activeSessionId);

      if (data.sessionId) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
        setSessionId(data.sessionId);
      }

      setMessages((current) => [
        ...current,
        createMessage("agent", data.message || "Done."),
      ]);

      await loadTasks();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown frontend error";

      setMessages((current) => [
        ...current,
        createMessage("agent", `Something went wrong: ${message}`),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteTask(task: Task) {
    if (!apiUrl || updatingTaskId) return;

    setUpdatingTaskId(task.taskId);

    try {
      await deleteTaskApi(apiUrl, task.taskId);
      setTasks((current) => current.filter((t) => t.taskId !== task.taskId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete task";

      setMessages((current) => [
        ...current,
        createMessage("agent", `Couldn't delete "${task.title}": ${message}`),
      ]);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function toggleTaskComplete(task: Task) {
    if (!apiUrl || updatingTaskId) return;

    const nextStatus = task.status === "completed" ? "pending" : "completed";

    setUpdatingTaskId(task.taskId);

    try {
      const updated = await updateTaskApi(apiUrl, task.taskId, {
        status: nextStatus,
      });

      setTasks((current) =>
        current.map((item) => (item.taskId === updated.taskId ? updated : item))
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update task";

      setMessages((current) => [
        ...current,
        createMessage("agent", `Couldn't update "${task.title}": ${message}`),
      ]);
    } finally {
      setUpdatingTaskId(null);
    }
  }

  useEffect(() => {
    if (!apiUrl) return;

    let cancelled = false;

    fetchTasks(apiUrl)
      .then((nextTasks) => {
        if (!cancelled) setTasks(nextTasks);
      })
      .catch((error) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Could not load tasks";

          setMessages((current) => [
            ...current,
            createMessage("agent", `Couldn't refresh tasks: ${message}`),
          ]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none fixed left-[-180px] top-[-180px] h-[420px] w-[420px] rounded-full bg-[var(--sb-cyan)]/10 blur-3xl" />
      <div className="pointer-events-none fixed bottom-[-220px] right-[-180px] h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />

      <SiteHeader />

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-3 flex items-center gap-2">
          <p className="sb-label">Agent Workspace</p>
          <span className="text-[var(--sb-border)]">·</span>
          <h1 className="text-sm font-bold text-[var(--sb-text)]">
            AI Task Tracker
          </h1>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
          <ChatPanel
            messages={messages}
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSend={() => sendMessage(input)}
            onQuickPrompt={sendMessage}
          />

          <TaskList
            tasks={tasks}
            filter={filter}
            onFilterChange={setFilter}
            onToggleComplete={toggleTaskComplete}
            onDelete={deleteTask}
            onRefresh={loadTasks}
            updatingTaskId={updatingTaskId}
            isRefreshing={isRefreshing}
            completionPercent={completionPercent}
          />
        </div>
      </main>
    </div>
  );
}