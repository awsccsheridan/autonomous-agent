# Build Your First Autonomous AI Agent on AWS

A beginner-friendly AWS workshop project where students build a serverless AI-powered task tracker using Next.js, AWS Lambda, API Gateway, DynamoDB, Amazon Bedrock, AWS CDK, and AWS Amplify.

The app lets a user type a task in plain English. The AI agent extracts structured task details, stores the task in DynamoDB, and displays it in a dashboard.

---

## What You Will Build

```text
User
↓
Next.js Frontend
↓
API Gateway
↓
AWS Lambda
↓
Amazon Bedrock Nova Model
↓
AI extracts task details
↓
Lambda stores task in DynamoDB
↓
Frontend displays task dashboard
```

Example user input:

```text
Add assignment due on June 25 for Digital Principles
```

Example extracted task:

```json
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

- **Amazon Bedrock**: extracts task details from natural language
- **AWS Lambda**: backend logic
- **Amazon API Gateway**: public API endpoint
- **Amazon DynamoDB**: task storage
- **AWS CDK**: infrastructure as code
- **AWS Amplify**: frontend hosting
- **CloudWatch**: backend logs

---

## Repository Structure

```text
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
    │   └── index.ts
    ├── cdk.json
    ├── package.json
    └── tsconfig.json
```

---

## Prerequisites

Install before starting:

- Node.js LTS
- Git
- Visual Studio Code
- AWS CLI
- AWS CDK
- GitHub account
- AWS account

Check installations:

```bash
node -v
npm -v
git --version
aws --version
cdk --version
```

If `cdk --version` does not work, use:

```bash
npx cdk --version
```

---

## Important Region

Use this AWS region for the workshop:

```text
us-east-1
```

For Mac/Linux:

```bash
export AWS_REGION=us-east-1
```

For Windows PowerShell:

```powershell
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
6. Enable Amazon Nova model access.
7. Save changes.

The model may appear as:

- Amazon Nova Lite
- Amazon Nova 2 Lite

---

## Clone the Repository

```bash
git clone https://github.com/awsccsheridan/autonomous-agent.git
cd autonomous-agent
code .
```

If `code .` does not work, open the folder manually in VS Code.

---

## Install Frontend Dependencies

From the project root:

```bash
npm install
```

---

## Run Frontend Locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend may load before backend deployment, but task creation will only work after the backend API is deployed and connected.

Stop the frontend with:

```text
Ctrl + C
```

---

## Deploy Backend

Go to the backend folder:

```bash
cd backend
```

Install backend dependencies:

```bash
npm install
```

Install esbuild:

```bash
npm install --save-dev esbuild
```

Bootstrap CDK:

```bash
npx cdk bootstrap
```

Deploy:

```bash
npx cdk deploy
```

When asked:

```text
Do you wish to deploy these changes?
```

Type:

```text
y
```

After deployment, copy the API output:

```text
AutonomousAgentStack.ApiUrl = https://example.execute-api.us-east-1.amazonaws.com/prod/
```

---

## Connect Frontend to Backend

Go back to the project root:

```bash
cd ..
```

Create a file:

```text
.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=https://your-api-url.execute-api.us-east-1.amazonaws.com/prod
```

Important:

- no quotes
- no spaces
- include `https://`
- avoid an extra trailing slash

Example:

```env
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/prod
```

Restart the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Test with:

```text
Add assignment due on June 25 for Digital Principles
```

---

## Deploy Frontend With AWS Amplify

1. Open AWS Amplify in the AWS Console.
2. Choose region `us-east-1`.
3. Click **Create new app**.
4. Choose **Host web app**.
5. Choose **GitHub**.
6. Select repository:

```text
awsccsheridan/autonomous-agent
```

7. Select branch:

```text
main
```

8. Use build settings:

```text
Install command: npm install
Build command: npm run build
Output directory: .next
```

9. Add environment variable:

```text
NEXT_PUBLIC_API_URL
```

Value:

```text
https://your-api-url.execute-api.us-east-1.amazonaws.com/prod
```

10. Click **Save and deploy**.

Amplify will provide a public website URL after deployment.

---

## Common Issues and Fixes

### `aws command not found`

Restart terminal or reinstall AWS CLI.

Check:

```bash
aws --version
```

### AWS credentials error

Run:

```bash
aws configure
```

Then check:

```bash
aws sts get-caller-identity
```

### Wrong AWS region

Use:

```text
us-east-1
```

### Bedrock access denied

Enable Amazon Nova model access in Amazon Bedrock.

### `cdk command not found`

Use:

```bash
npx cdk deploy
```

### Frontend says API URL is missing

Make sure `.env.local` exists in the project root and contains:

```env
NEXT_PUBLIC_API_URL=your-api-url
```

Restart:

```bash
npm run dev
```

### Failed to fetch

Check:

- backend deployed successfully
- API URL copied correctly
- `.env.local` has correct value
- frontend was restarted after editing `.env.local`
- browser console for CORS errors

### GitHub password does not work

Use a GitHub Personal Access Token instead of your normal GitHub password.

---

## Destroy AWS Resources

To avoid charges after the workshop, destroy the backend stack.

From the backend folder:

```bash
npx cdk destroy
```

When asked:

```text
Are you sure you want to delete?
```

Type:

```text
y
```

This removes CDK-created resources such as:

- API Gateway
- Lambda
- DynamoDB table
- IAM roles created by CDK
- CloudFormation stack resources

Also check manually:

- CloudWatch log groups
- Amplify app
- IAM access keys if no longer needed

---

## Final Test Prompts

```text
Add assignment due on June 25 for Digital Principles
```

```text
Create a high priority task to finish AWS workshop slides tomorrow
```

If tasks appear in the dashboard, the project is working.

---


