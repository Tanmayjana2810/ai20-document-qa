// The main chat area: message list + the input box + "Clear Chat" and the
// optional "search the web" toggle.

import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  sending: boolean;
  onAsk: (question: string) => void;
  onClear: () => void;
  useWeb: boolean;
  onToggleWeb: (v: boolean) => void;
  webAvailable: boolean;
  hasDoc: boolean;
  docName: string | null;
}

export function ChatWindow({
  messages,
  sending,
  onAsk,
  onClear,
  useWeb,
  onToggleWeb,
  webAvailable,
  hasDoc,
  docName,
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function submit() {
    const q = draft.trim();
    if (!q || sending) return;
    onAsk(q);
    setDraft("");
  }

  // Download the current conversation as a Markdown file.
  function exportChat() {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `**${m.role === "user" ? "You" : "Assistant"}:**\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai20-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="chat">
      <div className="chat-toolbar">
        <div className="toolbar-left-slot">
          {webAvailable && (
            <label className="web-toggle">
              <input
                type="checkbox"
                checked={useWeb}
                onChange={(e) => onToggleWeb(e.target.checked)}
              />
              Search the web if not in document
            </label>
          )}
        </div>
        <div className="toolbar-actions">
          <button className="clear-btn" onClick={exportChat} disabled={messages.length === 0}>
            Export
          </button>
          <button className="clear-btn" onClick={onClear} disabled={messages.length === 0}>
            Clear Chat
          </button>
        </div>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="placeholder">
            {hasDoc ? (
              <>
                <div className="wave">👋</div>
                <h2>Hi! What would you like to ask today?</h2>
                <p className="ready-line">
                  <span className="doc-dot" /> Ready to answer questions about{" "}
                  <strong>{docName}</strong>
                </p>
              </>
            ) : (
              <>
                <h2>Ask anything about your document</h2>
                <p>Upload a PDF or .txt file (or drag it anywhere) to get started.</p>
              </>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <textarea
          value={draft}
          placeholder={hasDoc ? "Ask a question…" : "Upload a document first…"}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button onClick={submit} disabled={sending || !draft.trim()}>
          Send
        </button>
      </div>
    </section>
  );
}
