import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function tableName() {
  const name = process.env.TASKS_TABLE_NAME;
  if (!name) {
    throw new Error("TASKS_TABLE_NAME is not configured");
  }
  return name;
}

export async function createTask(input) {
  const priority = ["low", "medium", "high"].includes(input.priority || "")
    ? input.priority
    : "medium";

  const task = {
    taskId: randomUUID(),
    title: input.title || "Untitled task",
    dueDate: input.dueDate || "unknown",
    category: input.category || "general",
    priority,
    status: "pending",
    originalRequest: input.originalRequest || input.title,
    createdAt: new Date().toISOString(),
  };

  await dynamo.send(
    new PutCommand({
      TableName: tableName(),
      Item: task,
    })
  );

  return task;
}

export async function listTasks() {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: tableName(),
    })
  );

  return (result.Items || []).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export async function updateTask(taskId, updates) {
  const tasks = await listTasks();
  const existing = tasks.find((task) => task.taskId === taskId);

  if (!existing) {
    return null;
  }

  const status = ["pending", "completed"].includes(updates.status || "")
    ? updates.status
    : existing.status;

  const priority = ["low", "medium", "high"].includes(updates.priority || "")
    ? updates.priority
    : existing.priority;

  await dynamo.send(
    new UpdateCommand({
      TableName: tableName(),
      Key: { taskId },
      UpdateExpression: "SET #status = :status, #priority = :priority",
      ExpressionAttributeNames: {
        "#status": "status",
        "#priority": "priority",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":priority": priority,
      },
    })
  );

  return { ...existing, status, priority };
}
