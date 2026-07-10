"use client";

import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
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
    <section className="sb-panel flex h-full min-h-0 flex-col rounded-[2rem]">
      <header className="border-b border-[var(--sb-border)] px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="sb-label">Chat with the agent</p>
            <h2 className="text-base font-bold text-[var(--sb-text)]">
              Bedrock Task Assistant
            </h2>
          </div>

          <div className="rounded-xl border border-[var(--sb-border)] bg-[var(--sb-cyan-dim)] px-3 py-1.5 text-center">
            <p className="font-[family-name:var(--font-mono)] text-[9px] font-bold uppercase tracking-wider text-[var(--sb-cyan)]">
              Agentic
            </p>
          </div>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
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
                {isUser ? (
                  message.content
                ) : (
                  <Markdown
                    components={{
                      p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-bold text-[var(--sb-text)]">{children}</strong>,
                      ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
                      ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
                      li: ({ children }) => <li>{children}</li>,
                    }}
                  >
                    {message.content}
                  </Markdown>
                )}
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

      <div className="border-t border-[var(--sb-border)] px-5 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onQuickPrompt(prompt)}
              disabled={isLoading}
              className="rounded-lg border border-[var(--sb-border)] bg-[var(--sb-bg-elevated)] px-2.5 py-1 text-left text-[11px] text-[var(--sb-text-muted)] transition hover:border-[var(--sb-cyan)] hover:text-[var(--sb-text)] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="flex flex-col rounded-2xl border border-[var(--sb-border)] bg-[var(--sb-bg)] transition focus-within:border-[var(--sb-cyan)]">
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Ask the agent something - "Add dentist appointment tomorrow"'
            rows={2}
            disabled={isLoading}
            className="min-h-[52px] w-full resize-none bg-transparent px-4 pt-3 text-sm text-[var(--sb-text)] outline-none placeholder:text-[var(--sb-text-muted)] disabled:opacity-60"
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <p className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-[var(--sb-text-muted)]">
              Enter to send - Shift+Enter for new line
            </p>
            <button
              type="button"
              onClick={onSend}
              disabled={isLoading || !input.trim()}
              className="sb-btn-primary rounded-xl px-4 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}