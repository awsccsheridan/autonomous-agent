export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "completed";

export type Task = {
  taskId: string;
  title: string;
  dueDate: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  originalRequest: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: number;
};
