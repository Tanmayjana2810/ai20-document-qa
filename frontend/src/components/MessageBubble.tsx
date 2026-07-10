// A single chat bubble. User messages sit on the right, assistant on the left.
// Assistant answers are rendered as Markdown (so bold, lists, code render nicely).
// Each assistant message has a copy button and every message shows a timestamp.

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message } from "../types";

interface Props {
  message: Message;
  typing?: boolean;
}

function formatTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function MessageBubble({ message, typing }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  // Show the typing animation for an assistant bubble that has no text yet
  // (i.e. we're waiting for the first streamed token).
  const showTyping = typing || (!isUser && message.content === "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  return (
    <div className={`bubble-row ${isUser ? "user" : "assistant"}`}>
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>
        {showTyping ? (
          <span className="typing">
            <span></span>
            <span></span>
            <span></span>
          </span>
        ) : (
          <>
            <div className="bubble-text">
              {isUser ? (
                message.content
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              )}
            </div>

            {!isUser && message.grounded === false && (
              <div className="badge not-in-doc">Not found in document</div>
            )}

            <div className="bubble-meta">
              {message.createdAt && <span className="time">{formatTime(message.createdAt)}</span>}
              {!isUser && (
                <button className="copy-btn" onClick={copy} title="Copy answer">
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
