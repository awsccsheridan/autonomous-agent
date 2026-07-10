import type { Task, TaskPriority, TaskStatus } from "@/types/task";

export function normalizeApiUrl(url: string | undefined) {
  return url?.replace(/\/+$/, "") ?? "";
}

export async function fetchTasks(apiUrl: string): Promise<Task[]> {
  const response = await fetch(`${apiUrl}/tasks`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to load tasks");
  }

  return data.tasks || [];
}

export async function updateTaskApi(
  apiUrl: string,
  taskId: string,
  updates: Partial<{
    status: TaskStatus;
    priority: TaskPriority;
    title: string;
    dueDate: string;
    category: string;
  }>
): Promise<Task> {
  const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update task");
  }

  return data.task;
}

export async function deleteTaskApi(
  apiUrl: string,
  taskId: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete task");
  }
}

export async function sendChatMessage(
  apiUrl: string,
  message: string,
  sessionId: string
): Promise<{ message: string; sessionId: string }> {
  const response = await fetch(`${apiUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.details || data.error || "Something went wrong");
  }

  return data;
}
