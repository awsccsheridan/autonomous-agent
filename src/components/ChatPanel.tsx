"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/task";

const QUICK_PROMPTS = [
  "Add a task: finish lab report by Friday",
  "What is on my list?",
  "I finished the homework assignment",
  "Mark my highest priority task as done",
];

type ChatPanelProps = {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickPrompt: (prompt: string) => void;
};

export function ChatPanel({
  messages,
  input,
  isLoading,
  onInputChange,
  onSend,
  onQuickPrompt,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;

    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <section className="sb-panel flex h-full min-h-[620px] flex-col rounded-[2rem]">
      <header className="border-b border-[var(--sb-border)] px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="sb-label">Chat with the agent</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--sb-text)]">
              Bedrock Task Assistant
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sb-text-muted)]">
              Add tasks, list tasks, or tell the agent something is done. The
              agent decides which backend tool to call.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-cyan-dim)] px-4 py-3 text-center sm:block">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--sb-text-muted)]">
              Mode
            </p>
            <p className="font-[family-name:var(--font-mono)] text-xs font-bold uppercase tracking-wider text-[var(--sb-cyan)]">
              Agentic
            </p>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  isUser
                    ? "rounded-br-sm bg-[var(--sb-cyan)] text-[#071018]"
                    : "rounded-bl-sm border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] text-[var(--sb-text)]"
                }`}
              >
                <div className="mb-1 font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider opacity-70">
                  {isUser ? "You" : "Agent"}
                </div>
                {message.content}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] px-4 py-3 text-sm text-[var(--sb-text-muted)] shadow-lg">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-ping rounded-full bg-[var(--sb-cyan)]" />
                Agent is thinking and selecting a tool...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--sb-border)] px-5 py-5">
        <p className="sb-label mb-3">Try these prompts</p>

        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              disabled={isLoading}
              className="rounded-xl border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] px-3 py-2 text-left text-xs leading-relaxed text-[var(--sb-text-muted)] transition hover:border-[var(--sb-cyan)] hover:text-[var(--sb-text)] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Try: "Add dentist appointment tomorrow"'
            rows={2}
            disabled={isLoading}
            className="min-h-[56px] flex-1 resize-none rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg)] px-4 py-3 text-sm text-[var(--sb-text)] outline-none transition placeholder:text-[var(--sb-text-muted)] focus:border-[var(--sb-cyan)] disabled:opacity-60"
          />

          <button
            type="button"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="sb-btn-primary self-end rounded-2xl px-5 py-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <p className="mt-3 font-[family-name:var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--sb-text-muted)]">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </section>
  );
}