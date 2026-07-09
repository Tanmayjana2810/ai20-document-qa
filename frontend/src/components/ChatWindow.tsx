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
}

export function ChatWindow({
  messages,
  sending,
  onAsk,
  onClear,
  useWeb,
  onToggleWeb,
  webAvailable,
}: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function submit() {
    const q = draft.trim();
    if (!q || sending) return;
    onAsk(q);
    setDraft("");
  }

  return (
    <section className="chat">
      <div className="chat-toolbar">
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
        <button className="clear-btn" onClick={onClear} disabled={messages.length === 0}>
          Clear Chat
        </button>
      </div>

      <div className="messages">
        {messages.length === 0 && (
          <div className="placeholder">
            <h2>Ask anything about your document</h2>
            <p>Upload a PDF or .txt file, then type a question below.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {sending && <MessageBubble message={{ role: "assistant", content: "…", createdAt: "" }} typing />}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <textarea
          value={draft}
          placeholder="Ask a question…"
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
