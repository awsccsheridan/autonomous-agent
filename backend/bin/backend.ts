#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AgentStack } from "../lib/agent-stack";

const app = new cdk.App();

new AgentStack(app, "AutonomousAgentStack", {
  env: {
    region: process.env.AWS_REGION || "us-east-1",
  },
});