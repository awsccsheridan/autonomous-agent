import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";

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

    const agentFunction = new nodeLambda.NodejsFunction(this, "AgentFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: "lambda/index.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        TASKS_TABLE_NAME: tasksTable.tableName,
        MODEL_ID: "global.amazon.nova-2-lite-v1:0",
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node22",
      },
    });

    tasksTable.grantReadWriteData(agentFunction);

    agentFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:Converse"
        ],
        resources: ["*"],
      })
    );

    const api = new apigateway.RestApi(this, "AgentApi", {
      restApiName: "Autonomous Agent API",
      description: "API for autonomous AI task tracker agent",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });

    const tasksResource = api.root.addResource("tasks");

    tasksResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(agentFunction)
    );

    tasksResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(agentFunction)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL for autonomous agent backend",
    });
  }
}