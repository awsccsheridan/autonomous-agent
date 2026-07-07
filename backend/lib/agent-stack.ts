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

const AGENT_INSTRUCTION = `You are an autonomous task management assistant for students.

When the user wants to add a task:
1. Infer a short clear title from the request when needed (example: "Digital Principles assignment").
2. Extract dueDate (YYYY-MM-DD or unknown), category (course name or general), and priority (low, medium, or high; default medium).
3. Call the createTask action with title, dueDate, category, priority, and originalRequest.
4. Set originalRequest to the user's exact message.

When the user asks to see, list, or review tasks, call listTasks and summarize the results clearly.

When the user wants to mark a task complete or change priority, call updateTask with the taskId and new values.

Do not ask unnecessary clarifying questions if the request already contains enough information to create the task.

Today's date should be used to interpret relative dates like "tomorrow" or "next Friday".

Always confirm what you did in friendly plain English.`;

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

    tasksTable.grantReadData(proxyFunction);

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
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });

    api.root.addResource("chat").addMethod(
      "POST",
      new apigateway.LambdaIntegration(proxyFunction)
    );

    api.root.addResource("tasks").addMethod(
      "GET",
      new apigateway.LambdaIntegration(proxyFunction)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL for autonomous agent backend",
    });

    new cdk.CfnOutput(this, "AgentId", {
      value: bedrockAgent.attrAgentId,
      description: "Bedrock Agent ID",
    });

    new cdk.CfnOutput(this, "AgentRoleArn", {
      value: agentRole.roleArn,
      description: "Bedrock Agent service role ARN",
    });

    new cdk.CfnOutput(this, "FoundationModel", {
      value: FOUNDATION_MODEL,
      description: "Inference profile ID for the Bedrock Agent",
    });
  }
}
