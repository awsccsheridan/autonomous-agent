import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { randomUUID } from "crypto";
import { listTasks } from "./tasks-db.mjs";

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
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
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

  return completion.trim() || "The agent completed your request.";
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return response(200, { message: "OK" });
    }

    const path = event.path?.replace(/\/+$/, "") || "";
    const route = path.split("/").pop();

    if (event.httpMethod === "GET" && route === "tasks") {
      const tasks = await listTasks();
      return response(200, { tasks });
    }

    if (event.httpMethod === "POST" && route === "chat") {
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
      const agentReply = await invokeBedrockAgent(body.message.trim(), sessionId);

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
