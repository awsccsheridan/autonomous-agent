import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TASKS_TABLE_NAME = process.env.TASKS_TABLE_NAME || "";
const MODEL_ID = process.env.MODEL_ID || "global.amazon.nova-2-lite-v1:0";

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

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function safeJsonParse(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

async function extractTaskWithAI(userRequest: string) {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `
You are an autonomous AI task extraction agent.

Today's date is ${today}.

User request:
"${userRequest}"

Extract the task details from this request.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanation.

JSON format:
{
  "title": "short task title",
  "dueDate": "YYYY-MM-DD or unknown",
  "category": "course, subject, or general",
  "priority": "low, medium, or high"
}

Rules:
- If no priority is mentioned, use "medium".
- If no category/course is mentioned, use "general".
- If date is unclear, use "unknown".
- Keep the title short and clear.
`;

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: "user",
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 400,
      temperature: 0.2,
    },
  });

  const result = await bedrock.send(command);

  const outputText =
    result.output?.message?.content
      ?.map((item) => item.text || "")
      .join("")
      .trim() || "";

  return safeJsonParse(outputText);
}

async function createTask(userRequest: string): Promise<Task> {
  const extracted = await extractTaskWithAI(userRequest);

  const task: Task = {
    taskId: randomUUID(),
    title: extracted.title || "Untitled task",
    dueDate: extracted.dueDate || "unknown",
    category: extracted.category || "general",
    priority: ["low", "medium", "high"].includes(extracted.priority)
      ? extracted.priority
      : "medium",
    status: "pending",
    originalRequest: userRequest,
    createdAt: new Date().toISOString(),
  };

  await dynamo.send(
    new PutCommand({
      TableName: TASKS_TABLE_NAME,
      Item: task,
    })
  );

  return task;
}

async function listTasks(): Promise<Task[]> {
  const result = await dynamo.send(
    new ScanCommand({
      TableName: TASKS_TABLE_NAME,
    })
  );

  return (result.Items || []) as Task[];
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    if (event.httpMethod === "OPTIONS") {
      return response(200, { message: "OK" });
    }

    if (event.httpMethod === "GET") {
      const tasks = await listTasks();

      return response(200, {
        tasks: tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    }

    if (event.httpMethod === "POST") {
      if (!event.body) {
        return response(400, { error: "Missing request body" });
      }

      const body = JSON.parse(event.body) as { message?: string };

      if (!body.message || !body.message.trim()) {
        return response(400, { error: "Message is required" });
      }

      const task = await createTask(body.message.trim());

      return response(201, {
        message: `Task created successfully: ${task.title}`,
        task,
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