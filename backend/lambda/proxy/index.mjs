import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { randomUUID } from "crypto";
import { createTask, deleteTask, listTasks, updateTask } from "./tasks-db.mjs";
import {
  isCompleteIntent,
  isGenericAgentReply,
  isListIntent,
  pickBestTaskMatch,
} from "./task-intent.mjs";

const bedrockAgent = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const AGENT_ID = process.env.AGENT_ID || "";
const AGENT_ALIAS_ID = process.env.AGENT_ALIAS_ID || "TSTALIASID";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function stripFunctionMarkup(text) {
  return text
    .replace(/<__function[^>]*>[\s\S]*?<\/__function>/gi, "")
    .replace(/<__parameter=\w+>[\s\S]*?<\/__parameter>/gi, "")
    .trim();
}

function parseLeakedAgentAction(text) {
  if (!text.includes("__parameter=") && !text.includes("__function=")) {
    return null;
  }

  const params = {};

  for (const match of text.matchAll(
    /<__parameter=(\w+)>([\s\S]*?)<\/__parameter>/gi
  )) {
    params[match[1]] = match[2].trim();
  }

  const fnMatch = text.match(/<__function=(\w+)/i);
  const httpMethod = fnMatch?.[1]?.toLowerCase() ?? "";

  if (httpMethod === "get" || /listtasks/i.test(text)) {
    return { action: "list", params };
  }

  if (
    httpMethod === "patch" ||
    params.taskId ||
    params.status ||
    /updatetask/i.test(text)
  ) {
    return { action: "update", params };
  }

  if (httpMethod === "post" || params.title || /createtask/i.test(text)) {
    return { action: "create", params };
  }

  return null;
}

async function resolveUpdateTarget(params, userMessage) {
  if (params.taskId) {
    return { type: "match", taskId: params.taskId };
  }

  const tasks = await listTasks();
  const match = pickBestTaskMatch(userMessage, tasks);

  if (match.type === "match") {
    return { type: "match", taskId: match.task.taskId };
  }

  if (match.type === "ambiguous") {
    const names = match.candidates.map((task) => `"${task.title}"`).join(", ");
    return {
      type: "ambiguous",
      message: `Which task did you mean? I found: ${names}`,
    };
  }

  const pending = tasks.filter((task) => task.status === "pending");
  if (pending.length === 1) {
    return { type: "match", taskId: pending[0].taskId };
  }

  return { type: "none" };
}

async function executeLeakedAction(parsed, userMessage) {
  if (parsed.action === "create") {
    if (!parsed.params.title?.trim()) {
      return null;
    }

    const task = await createTask({
      title: parsed.params.title,
      dueDate: parsed.params.dueDate,
      category: parsed.params.category,
      priority: parsed.params.priority,
      originalRequest: parsed.params.originalRequest || parsed.params.title,
    });

    return `Done! I added "${task.title}" to your list (due ${task.dueDate}, ${task.priority} priority).`;
  }

  if (parsed.action === "list") {
    const tasks = await listTasks();

    if (tasks.length === 0) {
      return "Your list is empty right now.";
    }

    const lines = tasks.map(
      (task) =>
        `- ${task.title} [${task.status}] due ${task.dueDate} (${task.priority} priority)`
    );

    return `Here's your list:\n${lines.join("\n")}`;
  }

  if (parsed.action === "update") {
    const updates = { ...parsed.params };

    if (!updates.status && isCompleteIntent(userMessage)) {
      updates.status = "completed";
    }

    const target = await resolveUpdateTarget(updates, userMessage);

    if (target.type === "ambiguous") {
      return target.message;
    }

    if (target.type !== "match") {
      return null;
    }

    const task = await updateTask(target.taskId, updates);

    if (!task) {
      return "I couldn't find that task to update.";
    }

    if (task.status === "completed") {
      return `Nice work! I marked "${task.title}" as done.`;
    }

    return `Updated "${task.title}" — status is now ${task.status}.`;
  }

  return null;
}

async function tryLocalIntent(userMessage) {
  if (isCompleteIntent(userMessage)) {
    const tasks = await listTasks();
    const match = pickBestTaskMatch(userMessage, tasks);

    if (match.type === "ambiguous") {
      const names = match.candidates.map((task) => `"${task.title}"`).join(", ");
      return `Which task did you finish? I found: ${names}`;
    }

    if (match.type === "match") {
      const updated = await updateTask(match.task.taskId, {
        status: "completed",
      });

      if (updated) {
        return `Nice work! I marked "${updated.title}" as done.`;
      }
    }

    const pending = tasks.filter((task) => task.status === "pending");
    if (pending.length === 1) {
      const updated = await updateTask(pending[0].taskId, {
        status: "completed",
      });

      if (updated) {
        return `Nice work! I marked "${updated.title}" as done.`;
      }
    }

    return 'I couldn\'t tell which task you finished. Try something like "I finished the DP assignment".';
  }

  if (isListIntent(userMessage)) {
    const tasks = await listTasks();

    if (tasks.length === 0) {
      return "Your list is empty right now.";
    }

    const lines = tasks.map(
      (task) =>
        `- ${task.title} [${task.status}] due ${task.dueDate} (${task.priority} priority)`
    );

    return `Here's your list:\n${lines.join("\n")}`;
  }

  return null;
}

async function invokeBedrockAgent(message, sessionId) {
  const command = new InvokeAgentCommand({
    agentId: AGENT_ID,
    agentAliasId: AGENT_ALIAS_ID,
    sessionId,
    inputText: message,
    enableTrace: false,
  });

  const result = await bedrockAgent.send(command);
  let completion = "";

  if (result.completion) {
    for await (const chunk of result.completion) {
      if (chunk.chunk?.bytes) {
        completion += new TextDecoder().decode(chunk.chunk.bytes);
      }
    }
  }

  return completion.trim();
}

async function getAgentReply(message, sessionId) {
  const rawReply = await invokeBedrockAgent(message, sessionId);
  const leakedAction = parseLeakedAgentAction(rawReply);

  if (leakedAction) {
    const executed = await executeLeakedAction(leakedAction, message);
    if (executed) {
      return executed;
    }
  }

  const localReply = await tryLocalIntent(message);
  if (localReply) {
    return localReply;
  }

  const cleaned = stripFunctionMarkup(rawReply);

  if (cleaned && !isGenericAgentReply(cleaned)) {
    return cleaned;
  }

  if (leakedAction?.action === "create" && leakedAction.params.title) {
    const task = await createTask({
      title: leakedAction.params.title,
      dueDate: leakedAction.params.dueDate,
      category: leakedAction.params.category,
      priority: leakedAction.params.priority,
      originalRequest:
        leakedAction.params.originalRequest || leakedAction.params.title,
    });

    return `Done! I added "${task.title}" to your list (due ${task.dueDate}, ${task.priority} priority).`;
  }

  return 'I couldn\'t figure out what to change. Try naming the task, like "I finished the DP assignment".';
}

function parseTaskIdFromPath(path) {
  const segments = path.split("/").filter(Boolean);
  const tasksIndex = segments.indexOf("tasks");

  if (tasksIndex === -1 || tasksIndex === segments.length - 1) {
    return null;
  }

  return segments[tasksIndex + 1];
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return response(200, { message: "OK" });
    }

    const path = event.path?.replace(/\/+$/, "") || "";

    if (event.httpMethod === "GET" && path.endsWith("/tasks")) {
      const tasks = await listTasks();
      return response(200, { tasks });
    }

    if (event.httpMethod === "PATCH" && path.includes("/tasks/")) {
      const taskId = parseTaskIdFromPath(path);

      if (!taskId) {
        return response(400, { error: "taskId is required" });
      }

      if (!event.body) {
        return response(400, { error: "Missing request body" });
      }

      const body = JSON.parse(event.body);
      const task = await updateTask(taskId, body);

      if (!task) {
        return response(404, { error: `Task not found: ${taskId}` });
      }

      return response(200, { message: "Task updated", task });
    }

    if (event.httpMethod === "DELETE" && path.includes("/tasks/")) {
      const taskId = parseTaskIdFromPath(path);

      if (!taskId) {
        return response(400, { error: "taskId is required" });
      }

      await deleteTask(taskId);
      return response(200, { message: "Task deleted" });
    }

    if (event.httpMethod === "POST" && path.endsWith("/chat")) {
      if (!AGENT_ID) {
        return response(500, {
          error: "Agent is not configured",
          details: "AGENT_ID environment variable is missing",
        });
      }

      if (!event.body) {
        return response(400, { error: "Missing request body" });
      }

      const body = JSON.parse(event.body);

      if (!body.message?.trim()) {
        return response(400, { error: "Message is required" });
      }

      const sessionId = body.sessionId?.trim() || randomUUID();
      const agentReply = await getAgentReply(body.message.trim(), sessionId);

      return response(200, {
        message: agentReply,
        sessionId,
      });
    }

    return response(405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Unknown backend error";

    return response(500, {
      error: "Something went wrong",
      details: message,
    });
  }
}