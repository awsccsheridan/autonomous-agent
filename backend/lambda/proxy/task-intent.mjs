const COMPLETE_RE =
  /\b(finish(?:ed|es|ing)?|finnished|done|completed|complete(?:d)?|mark(?:ed)?\s+(?:it\s+)?done|check(?:ed)?\s*off)\b/i;

const LIST_RE =
  /\b(what'?s on my list|show (?:my )?tasks|list (?:my )?tasks|my tasks|what do i have)\b/i;

const CREATE_RE =
  /\b(add|create|new task|remind me to|due on|due by|due date)\b/i;

const STOP_WORDS = new Set([
  "i",
  "have",
  "has",
  "had",
  "the",
  "my",
  "a",
  "an",
  "is",
  "it",
  "that",
  "this",
  "for",
  "on",
  "to",
  "just",
  "already",
  "task",
  "tasks",
]);

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function wordsMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) {
    return true;
  }

  const maxDistance = Math.max(1, Math.floor(Math.min(a.length, b.length) * 0.34));
  return levenshtein(a, b) <= maxDistance;
}

function messageKeywords(message) {
  let text = normalize(message);
  text = text
    .replace(COMPLETE_RE, " ")
    .replace(LIST_RE, " ")
    .replace(CREATE_RE, " ")
    .replace(
      /\b(finnished|finished|done|completed|complete|mark|check|off|have|just|already)\b/g,
      " "
    );

  return text
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function taskTokens(task) {
  const combined = normalize(`${task.title} ${task.category} ${task.originalRequest}`);
  return combined.split(" ").filter((word) => word.length > 1);
}

export function isCompleteIntent(message) {
  return COMPLETE_RE.test(message);
}

export function isListIntent(message) {
  return LIST_RE.test(message);
}

export function isCreateIntent(message) {
  return CREATE_RE.test(message);
}

export function isGenericAgentReply(text) {
  const cleaned = text.trim().toLowerCase();
  return (
    cleaned === "the agent completed your request." ||
    cleaned === "done! i updated your task list." ||
    cleaned === "done! i updated your task list" ||
    /^done!?\s*i updated your task list\.?$/i.test(text.trim())
  );
}

export function rankTasksForMessage(message, tasks) {
  const keywords = messageKeywords(message);
  const pending = tasks.filter((task) => task.status === "pending");

  return pending
    .map((task) => {
      const taskWords = taskTokens(task);
      let score = 0;

      for (const keyword of keywords) {
        for (const word of taskWords) {
          if (wordsMatch(keyword, word)) {
            score += word.length >= 4 ? 4 : 2;
          }
        }

        if (wordsMatch(keyword, normalize(task.category))) {
          score += 6;
        }

        if (normalize(task.title).includes(keyword)) {
          score += 3;
        }
      }

      return { task, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function pickBestTaskMatch(message, tasks) {
  const ranked = rankTasksForMessage(message, tasks);

  if (ranked.length === 0) {
    return { type: "none" };
  }

  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    return {
      type: "ambiguous",
      candidates: ranked.slice(0, 3).map((entry) => entry.task),
    };
  }

  if (ranked[0].score < 3) {
    return { type: "weak" };
  }

  return { type: "match", task: ranked[0].task };
}
