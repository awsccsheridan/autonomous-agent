import { createTask, listTasks, updateTask } from "./tasks-db.mjs";

function getParameter(parameters, name) {
  return parameters?.find((parameter) => parameter.name === name)?.value;
}

function getBodyProperties(event) {
  const properties =
    event.requestBody?.content?.["application/json"]?.properties ?? [];
  const result = {};

  for (const property of properties) {
    if (property.name && property.value !== undefined) {
      result[property.name] = property.value;
    }
  }

  return result;
}

function actionResponse(event, statusCode, body) {
  return {
    messageVersion: "1.0",
    response: {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      httpMethod: event.httpMethod,
      httpStatusCode: statusCode,
      responseBody: {
        "application/json": {
          body: JSON.stringify(body),
        },
      },
    },
    sessionAttributes: event.sessionAttributes ?? {},
    promptSessionAttributes: event.promptSessionAttributes ?? {},
  };
}

export async function handler(event) {
  try {
    const { apiPath, httpMethod } = event;

    if (apiPath === "/tasks" && httpMethod === "POST") {
      const body = getBodyProperties(event);

      if (!body.title?.trim()) {
        return actionResponse(event, 400, {
          error: "title is required to create a task",
        });
      }

      const task = await createTask({
        title: body.title.trim(),
        dueDate: body.dueDate,
        category: body.category,
        priority: body.priority,
        originalRequest: body.originalRequest || body.title,
      });

      return actionResponse(event, 200, {
        message: `Task created: ${task.title}`,
        task,
      });
    }

    if (apiPath === "/tasks" && httpMethod === "GET") {
      const tasks = await listTasks();

      return actionResponse(event, 200, {
        count: tasks.length,
        tasks,
      });
    }

    if (apiPath.startsWith("/tasks/") && httpMethod === "PATCH") {
      const taskId =
        getParameter(event.parameters, "taskId") ||
        apiPath.split("/").filter(Boolean).pop();

      if (!taskId) {
        return actionResponse(event, 400, {
          error: "taskId is required",
        });
      }

      const body = getBodyProperties(event);
      const task = await updateTask(taskId, {
        status: body.status,
        priority: body.priority,
        title: body.title,
        dueDate: body.dueDate,
        category: body.category,
      });

      if (!task) {
        return actionResponse(event, 404, {
          error: `Task not found: ${taskId}`,
        });
      }

      return actionResponse(event, 200, {
        message: `Task updated: ${task.title}`,
        task,
      });
    }

    return actionResponse(event, 404, {
      error: `Unsupported route: ${httpMethod} ${apiPath}`,
    });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof Error ? error.message : "Unknown action group error";

    return actionResponse(event, 500, {
      error: message,
    });
  }
}
