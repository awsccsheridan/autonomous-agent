"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/task";

const QUICK_PROMPTS = [
  "Add a task: finish lab report by Friday",
  "What's on my list?",
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
    <section className="sb-panel flex h-full min-h-[520px] flex-col">
      <header className="border-b border-[var(--sb-border)] px-5 py-4">
        <p className="sb-label">Bedrock Agent</p>
        <h2 className="text-lg font-bold text-[var(--sb-text)]">Task Assistant</h2>
        <p className="mt-3 text-sm text-[var(--sb-text-muted)]">
          Talk naturally — I&apos;ll figure out which task you mean
        </p>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "border border-[var(--sb-border-strong)] bg-[var(--sb-cyan)] text-[#071018]"
                  : "border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] font-[family-name:var(--font-mono)] text-[var(--sb-text)]"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] px-4 py-3 font-[family-name:var(--font-mono)] text-sm text-[var(--sb-text-muted)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse bg-[var(--sb-cyan)]" />
                Processing...
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--sb-border)] px-5 py-4">
        <p className="sb-label mb-3">Quick prompts</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              disabled={isLoading}
              className="sb-btn-outline px-3 py-1.5 normal-case tracking-normal disabled:opacity-50"
              style={{
                fontSize: "0.6875rem",
                letterSpacing: "0.04em",
                textTransform: "none",
              }}
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
            placeholder='Try: "I finished the lab report" or "Add dentist appointment tomorrow"'
            rows={2}
            disabled={isLoading}
            className="min-h-[52px] flex-1 resize-none border border-[var(--sb-border)] bg-[var(--sb-bg)] px-4 py-3 text-sm text-[var(--sb-text)] outline-none transition placeholder:text-[var(--sb-text-muted)] focus:border-[var(--sb-cyan)] disabled:opacity-60"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="sb-btn-primary self-end px-5 py-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <p className="mt-2 font-[family-name:var(--font-mono)] text-[0.625rem] uppercase tracking-wider text-[var(--sb-text-muted)]">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </section>
  );
}
