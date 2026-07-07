"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { TaskList } from "@/components/TaskList";
import {
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

export default function Home() {
  const apiUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

  const [input, setInput] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("active");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "agent",
      "Hey! I'm your AI to-do assistant. Add tasks in plain English, ask what's on your list, or tell me when you've finished something — even vaguely, like \"I done the homework\" — and I'll figure out which task you mean."
    ),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

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
    setSessionId(getOrCreateSessionId());
    loadTasks();
  }, [loadTasks]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <SiteHeader />

      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-10 max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[var(--sb-text)] sm:text-5xl">
            AI Task Tracker
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--sb-text-muted)]">
            Manage your to-do list by chatting naturally or checking tasks off
            directly. Powered by Amazon Bedrock — say you finished something
            without naming it exactly, and the agent figures out which task you
            mean.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
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
            onRefresh={loadTasks}
            updatingTaskId={updatingTaskId}
            isRefreshing={isRefreshing}
          />
        </div>
      </main>
    </div>
  );
}
