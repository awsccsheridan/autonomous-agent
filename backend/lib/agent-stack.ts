import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class AgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // We will add DynamoDB, Lambda, API Gateway, and Bedrock permissions here next.
  }
}