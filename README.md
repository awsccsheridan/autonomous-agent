# Build Your First Autonomous AI Agent on AWS

A beginner-friendly AWS workshop project where students build a serverless AI-powered task tracker using Next.js, AWS Lambda, API Gateway, DynamoDB, Amazon Bedrock, AWS CDK, and AWS Amplify.

The app lets a user type a task in plain English. The AI agent extracts structured task details, stores the task in DynamoDB, and displays it in a dashboard.

---

## Table of Contents

- [What You Will Build](#what-you-will-build)
- [Tech Stack](#tech-stack)
- [AWS Services Used](#aws-services-used)
- [Repository Structure](#repository-structure)
- [Cost Awareness](#cost-awareness)
- [Prerequisites](#prerequisites)
- [Create an AWS Account](#create-an-aws-account)
- [Create an IAM User and Sign In With aws login](#create-an-iam-user-and-sign-in-with-aws-login)
- [Important Region](#important-region)
- [Enable Bedrock Model Access](#enable-bedrock-model-access)
- [Fork the Repository](#fork-the-repository)
- [Clone the Repository](#clone-the-repository)
- [Install Frontend Dependencies](#install-frontend-dependencies)
- [Run Frontend Locally](#run-frontend-locally)
- [Deploy Backend](#deploy-backend)
- [Connect Frontend to Backend](#connect-frontend-to-backend)
- [Deploy Frontend With AWS Amplify](#deploy-frontend-with-aws-amplify)
- [Common Issues and Fixes](#common-issues-and-fixes)
- [Destroy AWS Resources](#destroy-aws-resources)
- [Final Test Prompts](#final-test-prompts)

---

## What You Will Build

```
User
↓
Next.js Frontend
↓
API Gateway
↓
Proxy Lambda (InvokeAgent)
↓
Amazon Bedrock Agent (Nova)
↓
Agent chooses action group tools
↓
Action Group Lambda
↓
DynamoDB
↓
Frontend displays task dashboard
```

Example user input:

```
Add assignment due on June 25 for Digital Principles
```

Example extracted task:

```
{
  "title": "Digital Principles assignment",
  "dueDate": "2026-06-25",
  "category": "Digital Principles",
  "priority": "medium",
  "status": "pending"
}
```

---

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- AWS CDK
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon Bedrock
- AWS Amplify

---

## AWS Services Used

- **Amazon Bedrock Agents**: orchestrates reasoning and tool use
- **Amazon Bedrock (Nova Lite)**: foundation model for the agent
- **AWS Lambda**: backend logic
- **Amazon API Gateway**: public API endpoint
- **Amazon DynamoDB**: task storage
- **AWS CDK**: infrastructure as code
- **AWS Amplify**: frontend hosting
- **CloudWatch**: backend logs

---

## Repository Structure

```
autonomous-agent/
├── src/
│   └── app/
│       ├── page.tsx
│       ├── layout.tsx
│       └── globals.css
│
├── public/
├── .env.example
├── package.json
├── tsconfig.json
│
└── backend/
    ├── bin/
    │   └── backend.ts
    ├── lib/
    │   └── agent-stack.ts
    ├── lambda/
    │   ├── action-group.ts
    │   ├── proxy.ts
    │   └── tasks-db.ts
    ├── schemas/
    │   └── tasks-api.json
    ├── cdk.json
    ├── package.json
    └── tsconfig.json
```

`.env.example` is a template for the environment variable the frontend needs (`NEXT_PUBLIC_API_URL`). You will copy it to `.env.local` later and fill in your real API URL — never commit `.env.local`.

---

## Cost Awareness

This workshop is not fully covered by the AWS Free Tier. Expected charges are small (typically well under $1–2 USD per student for a single workshop session), but you should know where the cost comes from:

- **Amazon Bedrock (Nova Lite)**: charged per token, per request
- **AWS Lambda / API Gateway / DynamoDB**: Free Tier eligible for new accounts, small usage
- **AWS Amplify hosting**: Free Tier eligible for low traffic
- **CloudWatch Logs**: minor storage cost

Before starting, set a **Billing budget alert** so you get an email if spend passes a threshold:
[https://console.aws.amazon.com/billing/home#/budgets](https://console.aws.amazon.com/billing/home#/budgets)

Always run [`cdk destroy`](#destroy-aws-resources) at the end of the workshop.

---

## Prerequisites

Install all of the following **before** the workshop starts.

| Tool | Minimum Version | Download / Install Link |
|---|---|---|
| Node.js | **20.9.0 or higher** (Next.js 16 requires this — Node 18 will fail) | [https://nodejs.org/en/download](https://nodejs.org/en/download) |
| Git | any recent version | [https://git-scm.com/downloads](https://git-scm.com/downloads) |
| Visual Studio Code | any recent version | [https://code.visualstudio.com/download](https://code.visualstudio.com/download) |
| AWS CLI v2 | **2.32.0 or higher** (needed for the `aws login` command) | [https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| AWS CDK | v2 | installed via npm, see below |
| GitHub account | — | [https://github.com/join](https://github.com/join) |
| AWS account | — | see [Create an AWS Account](#create-an-aws-account) |

**Tip:** if you already have Node.js installed but aren't sure of the version, or need to run multiple versions, use `nvm` (Node Version Manager) instead of reinstalling:
- macOS/Linux: [https://github.com/nvm-sh/nvm](https://github.com/nvm-sh/nvm)
- Windows: [https://github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows)

```
nvm install 22
nvm use 22
```

Install the AWS CDK CLI globally:

```
npm install -g aws-cdk
```

Check all installations:

```
node -v
npm -v
git --version
aws --version
cdk --version
```

`node -v` must print **v20.9.0 or higher** (v22.x LTS is a safe default). If `cdk --version` does not work even after installing it globally, use:

```
npx cdk --version
```

---

## Create an AWS Account

If you don't already have an AWS account:

1. Go to [https://aws.amazon.com/free/](https://aws.amazon.com/free/) and select **Create an AWS Account**.
2. Follow the signup steps (email, password, billing card required — you will not be charged unless you exceed Free Tier limits, see [Cost Awareness](#cost-awareness)).
3. Once signed in, you land in the **root user** account. Do not use root credentials day-to-day — create an IAM user instead (next section).

---

## Create an IAM User and Sign In With `aws login`

The AWS CLI and CDK need credentials to deploy resources on your behalf. This workshop uses the AWS CLI's `aws login` command instead of long-term access keys — it reuses your normal AWS Console sign-in (username + password) and issues short-term credentials that refresh automatically, so there are no access keys to create, copy, or accidentally leak.

1. Confirm your AWS CLI version is 2.32.0 or higher (required for `aws login`):

```
aws --version
```

If it's older, reinstall the CLI from the link in [Prerequisites](#prerequisites).

2. Sign in to the AWS Console as the root user (first time only) and open IAM:
   [https://console.aws.amazon.com/iam/home#/users](https://console.aws.amazon.com/iam/home#/users)
3. Create a new IAM user for yourself (**Users → Create user**) and check **"Provide user access to the AWS Management Console"** so the user has a console password. Set a password for yourself (or let AWS auto-generate one and note it down).
4. Attach these managed policies to the IAM user:
   - **AdministratorAccess** — broader than production best practice, but it avoids permission errors during a time-boxed workshop, since this stack creates IAM roles, Lambda, API Gateway, DynamoDB, and Bedrock resources.
   - **SignInLocalDevelopmentAccess** — this is what actually allows the user to use `aws login`.
   Full guide if you need it: [https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)
5. Sign out of the root user in your browser, then sign back in to the AWS Console as your new IAM user (you'll need the account ID or alias, your IAM username, and the password from step 3).
6. In your terminal, run:

```
aws login
```

7. If prompted, set your default region to `us-east-1`.
8. This opens your default browser to the AWS sign-in page. If you're already signed in there as your IAM user, just confirm the account/role. Otherwise, sign in with your IAM user's username and password.
9. Back in the terminal, you should see a message confirming you're logged in. Verify with:

```
aws sts get-caller-identity
```

You should see your account ID and IAM user ARN printed back, not an error.

A few things worth knowing:

- Credentials from `aws login` last up to 12 hours and refresh automatically while active — if they expire, just run `aws login` again.
- Working on a machine with no browser (e.g., a remote box or Cloud Shell)? Use `aws login --remote` instead, which gives you a URL to open on any device.
- To sign out at any time: `aws logout`.
- Using multiple AWS accounts? `aws login --profile <name>` sets up a named profile you can pass to later commands with `--profile <name>`.

---

## Important Region

Use this AWS region for the workshop:

```
us-east-1
```

For Mac/Linux:

```
export AWS_REGION=us-east-1
```

For Windows PowerShell:

```
$env:AWS_REGION="us-east-1"
```

---

## Enable Bedrock Model Access

Before deploying/testing the AI feature:

1. Open AWS Console.
2. Go to Amazon Bedrock.
3. Make sure the region is `us-east-1`.
4. Open **Model access**.
5. Click **Manage model access**.
6. Enable Amazon Nova model access (including Nova Lite for Bedrock Agents).
7. Save changes.

The model may appear as:

- Amazon Nova Lite
- Amazon Nova 2 Lite

**Note:** on brand-new AWS accounts, model access can take a few minutes (occasionally longer) to move from "In Progress" to "Access granted." If your agent deploy or test call fails right after enabling access, wait a few minutes and retry before assuming something is broken.

---

## Fork the Repository

Do this **before** cloning. The AWS Amplify step later needs push/GitHub-App access to the repo it deploys from — you won't have that on the original repo, only on your own copy.

1. Go to [https://github.com/awsccsheridan/autonomous-agent](https://github.com/awsccsheridan/autonomous-agent).
2. Click **Fork** (top right) and fork it into your own GitHub account.
3. Use **your fork's URL** (`https://github.com/<your-username>/autonomous-agent.git`) in every step below, not the original.

---

## Clone the Repository

```
git clone https://github.com/<your-username>/autonomous-agent.git
cd autonomous-agent
code .
```

If `code .` does not work, open the folder manually in VS Code.

---

## Install Frontend Dependencies

From the project root:

```
npm install
```

---

## Run Frontend Locally

```
npm run dev
```

Open:

```
http://localhost:3000
```

The frontend may load before backend deployment, but task creation will only work after the backend API is deployed and connected.

Stop the frontend with:

```
Ctrl + C
```

---

## Deploy Backend

Go to the backend folder:

```
cd backend
```

Install backend dependencies:

```
npm install
```

Install esbuild:

```
npm install --save-dev esbuild
```

Bootstrap CDK (only needed once per AWS account/region):

```
npx cdk bootstrap
```

Deploy:

```
npx cdk deploy
```

When asked:

```
Do you wish to deploy these changes?
```

Type:

```
y
```

After deployment, copy these outputs:

```
AutonomousAgentStack.ApiUrl = https://example.execute-api.us-east-1.amazonaws.com/prod/
AutonomousAgentStack.AgentId = XXXXXXXXXX
AutonomousAgentStack.AgentAliasId = TSTALIASID
```

The first deploy may take a few extra minutes while the Bedrock Agent is created and prepared.

---

## Connect Frontend to Backend

Go back to the project root:

```
cd ..
```

Copy the example environment file:

```
cp .env.example .env.local
```

(Windows PowerShell: `copy .env.example .env.local`)

Open `.env.local` and set:

```
NEXT_PUBLIC_API_URL=https://your-api-url.execute-api.us-east-1.amazonaws.com/prod
```

Important:

- no quotes
- no spaces
- include `https://`
- avoid an extra trailing slash

Example:

```
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

Restart the frontend:

```
npm run dev
```

Open:

```
http://localhost:3000
```

Test with:

```
Add assignment due on June 25 for Digital Principles
```

---

## Deploy Frontend With AWS Amplify

1. Open AWS Amplify in the AWS Console.
2. Choose region `us-east-1`.
3. Click **Create new app**.
4. Choose **Host web app**.
5. Choose **GitHub**, and authorize the AWS Amplify GitHub App if prompted (this is what requires you to be deploying from **your own fork**).
6. Select repository:

```
<your-username>/autonomous-agent
```

7. Select branch:

```
main
```

8. Use build settings:

```
Install command: npm install
Build command: npm run build
Output directory: .next
```

9. Under **Advanced settings**, set the build image Node.js version to **20 or later** (Amplify's default build image may still default to an older Node version, which will fail the build with this codebase — see [Common Issues](#common-issues-and-fixes)).
10. Add environment variable:

```
NEXT_PUBLIC_API_URL
```

Value:

```
https://your-api-url.execute-api.us-east-1.amazonaws.com/prod
```

11. Click **Save and deploy**.

Amplify will provide a public website URL after deployment.

---

## Common Issues and Fixes

### `aws command not found`

Restart terminal or reinstall AWS CLI. Check:

```
aws --version
```

### AWS credentials error / session expired

`aws login` credentials expire after up to 12 hours. Just sign in again:

```
aws login
```

Then check:

```
aws sts get-caller-identity
```

If `aws login` isn't recognized at all, your AWS CLI is older than 2.32.0 — reinstall from the link in [Prerequisites](#prerequisites).

### Wrong AWS region

Use:

```
us-east-1
```

### Bedrock access denied

Enable Amazon Nova model access in Amazon Bedrock (see [Enable Bedrock Model Access](#enable-bedrock-model-access)). If you just enabled it, wait a few minutes for it to propagate before retrying.

### `cdk command not found`

Use:

```
npx cdk deploy
```

Or reinstall globally:

```
npm install -g aws-cdk
```

### `npx cdk bootstrap` or `cdk deploy` fails with an access/permission error

Your IAM user likely doesn't have enough permissions. Confirm the `AdministratorAccess` policy is attached to the IAM user you signed in as (see [Create an IAM User](#create-an-iam-user-and-sign-in-with-aws-login)), and that `aws sts get-caller-identity` shows the correct account/user.

### `npm install` fails with `EBADENGINE` or Next.js won't start

Your Node.js version is too old. This project needs **Node.js 20.9.0 or higher**. Check with `node -v`. If it's lower, install a newer version (see [Prerequisites](#prerequisites)) or switch with `nvm use 22`.

### Frontend says API URL is missing

Make sure `.env.local` exists in the project root and contains:

```
NEXT_PUBLIC_API_URL=your-api-url
```

Restart:

```
npm run dev
```

### Failed to fetch

Check:

- backend deployed successfully
- API URL copied correctly
- `.env.local` has correct value
- frontend was restarted after editing `.env.local`
- browser console for CORS errors (see below)

### CORS error in the browser console

If the console shows something like `has been blocked by CORS policy`:

1. Confirm the API Gateway stage URL in `.env.local` exactly matches the `ApiUrl` output from `cdk deploy` (including `/prod`, no trailing slash).
2. Confirm you're calling the deployed API, not `localhost`.
3. If it still fails, redeploy the backend (`npx cdk deploy` from the `backend` folder) — CORS settings are defined in the CDK stack and only apply after a successful deploy.

### Amplify build fails (Node version / engine error)

Set the Node.js version in Amplify's build settings to 20 or later, since Amplify's default build image may run an older Node version than your local machine. This is set under **App settings → Build settings** or during initial app creation under **Advanced settings**.

### GitHub password does not work

Use a GitHub Personal Access Token instead of your normal GitHub password. Create one at:
[https://github.com/settings/tokens](https://github.com/settings/tokens)

---

## Destroy AWS Resources

To avoid charges after the workshop, destroy the backend stack.

From the backend folder:

```
cd backend
npx cdk destroy
```

When asked:

```
Are you sure you want to delete?
```

Type:

```
y
```

This removes CDK-created resources such as:

- API Gateway
- Lambda
- DynamoDB table
- IAM roles created by CDK
- CloudFormation stack resources

Also check manually and delete if no longer needed:

- CloudWatch log groups (CDK sometimes leaves these behind)
- The Amplify app (Amplify Console → your app → **Delete app**)
- IAM access keys, if this account won't be reused

Double-check the Billing dashboard a day later to confirm no unexpected charges:
[https://console.aws.amazon.com/billing/home](https://console.aws.amazon.com/billing/home)

---

## Final Test Prompts

```
Add assignment due on June 25 for Digital Principles
```

```
Create a high priority task to finish AWS workshop slides tomorrow
```

If tasks appear in the dashboard, the project is working.
