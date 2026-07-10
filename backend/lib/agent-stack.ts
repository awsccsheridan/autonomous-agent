import * as fs from "fs";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

// Use the global inference profile for Nova 2 Lite (required for on-demand use).
export const FOUNDATION_MODEL = "global.amazon.nova-2-lite-v1:0";

const AGENT_INSTRUCTION = `You are a friendly AI-powered to-do list assistant. Users talk in natural language; you manage their task list through tools.

CREATING TASKS
When the user wants to add something:
1. Infer a short clear title (example: "Digital Principles assignment").
2. Extract dueDate (YYYY-MM-DD or unknown), category (course or general), priority (low/medium/high, default medium).
3. Call createTask with title, dueDate, category, priority, and originalRequest set to the user's exact message.

LISTING TASKS
When the user asks what's on their list, what's due, or wants a summary, call listTasks and present tasks clearly (title, due date, status, priority).

UPDATING TASKS — including vague references
When the user says they finished something, wants to mark something done, change a date, rename a task, or refers loosely ("that one", "the assignment", "I done the math homework"):
1. ALWAYS call listTasks first.
2. Match the best task using title keywords, category, due date, priority, status (prefer pending tasks), and recent conversation context.
3. If one task clearly matches, call updateTask with that taskId and the changes (often status: completed).
4. If several tasks could match, ask one short clarifying question and list the candidates by title and due date.
5. If nothing matches, say so and offer to list tasks.

Do not ask unnecessary questions when creating a task if the message already has enough detail.

Use today's date to interpret relative dates like "tomorrow" or "next Friday".

Never show tool calls, XML tags, JSON, or internal function syntax to the user. Use action group tools silently, then reply in warm plain English.

Always confirm what you changed in warm, concise plain English.`;

export class AgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tasksTable = new dynamodb.Table(this, "TasksTable", {
      partitionKey: {
        name: "taskId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const agentRole = new iam.Role(this, "BedrockAgentRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      description: "Service role for the task tracker Bedrock Agent",
    });

    const agentRolePolicy = new iam.Policy(this, "BedrockAgentRolePolicy", {
      statements: [
        new iam.PolicyStatement({
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
            "bedrock:GetInferenceProfile",
          ],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/${FOUNDATION_MODEL}`,
            `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/us.amazon.nova-2-lite-v1:0`,
            `arn:aws:bedrock:*::foundation-model/amazon.nova-2-lite-v1:0`,
            `arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0`,
          ],
        }),
      ],
    });
    agentRole.attachInlinePolicy(agentRolePolicy);

    const actionGroupFunction = new lambda.Function(this, "ActionGroupFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../lambda/action-group")
      ),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        TASKS_TABLE_NAME: tasksTable.tableName,
      },
    });

    tasksTable.grantReadWriteData(actionGroupFunction);
    actionGroupFunction.grantInvoke(agentRole);

    actionGroupFunction.addPermission("AllowBedrockAgentInvoke", {
      principal: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      action: "lambda:InvokeFunction",
      sourceAccount: this.account,
      sourceArn: `arn:aws:bedrock:${this.region}:${this.account}:agent/*`,
    });

    const openApiSchema = fs.readFileSync(
      path.join(__dirname, "../schemas/tasks-api.json"),
      "utf-8"
    );

    const bedrockAgent = new bedrock.CfnAgent(this, "TaskTrackerAgent", {
      agentName: "TaskTrackerAgent",
      description: "Autonomous task tracker agent for student assignments",
      foundationModel: FOUNDATION_MODEL,
      instruction: AGENT_INSTRUCTION,
      agentResourceRoleArn: agentRole.roleArn,
      autoPrepare: true,
      idleSessionTtlInSeconds: 600,
      actionGroups: [
        {
          actionGroupName: "TaskManagement",
          actionGroupState: "ENABLED",
          description:
            "Create, list, and update tasks stored in DynamoDB for the student task tracker",
          actionGroupExecutor: {
            lambda: actionGroupFunction.functionArn,
          },
          apiSchema: {
            payload: openApiSchema,
          },
        },
      ],
    });

    bedrockAgent.node.addDependency(actionGroupFunction);
    // Agent must update AFTER the role policy exists (inference profile permissions).
    bedrockAgent.node.addDependency(agentRolePolicy);

    const proxyFunction = new lambda.Function(this, "ProxyFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../lambda/proxy")),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        TASKS_TABLE_NAME: tasksTable.tableName,
        AGENT_ID: bedrockAgent.attrAgentId,
        AGENT_ALIAS_ID: "TSTALIASID",
      },
    });

    tasksTable.grantReadWriteData(proxyFunction);

    proxyFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeAgent"],
        resources: [
          bedrockAgent.attrAgentArn,
          `arn:aws:bedrock:${this.region}:${this.account}:agent-alias/${bedrockAgent.attrAgentId}/*`,
        ],
      })
    );

    proxyFunction.node.addDependency(bedrockAgent);

    const api = new apigateway.RestApi(this, "AgentApi", {
      restApiName: "Autonomous Agent API",
      description: "API for Bedrock Agent task tracker",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });

    api.root.addResource("chat").addMethod(
      "POST",
      new apigateway.LambdaIntegration(proxyFunction)
    );

    const tasksResource = api.root.addResource("tasks");
    tasksResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(proxyFunction)
    );

    const taskResource = tasksResource.addResource("{taskId}");
    taskResource.addMethod(
      "PATCH",
      new apigateway.LambdaIntegration(proxyFunction)
    );
    taskResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(proxyFunction)
    );

    // RestApi adds a duplicate Endpoint output; keep only our student-facing ApiUrl.
    api.node.tryRemoveChild("Endpoint");

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL — set as NEXT_PUBLIC_API_URL in the frontend",
    });
  }
}
