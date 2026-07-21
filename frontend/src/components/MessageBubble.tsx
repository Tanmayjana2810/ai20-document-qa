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
  const [showSources, setShowSources] = useState(false);

  // Only show the citations panel for grounded answers that actually carried
  // retrieved passages back from the backend.
  const sources = message.sources ?? [];
  const hasSources = !isUser && message.grounded && sources.length > 0;

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

            {hasSources && (
              <div className="sources">
                <button
                  className="sources-toggle"
                  onClick={() => setShowSources((v) => !v)}
                  aria-expanded={showSources}
                >
                  <span className={`chevron ${showSources ? "open" : ""}`}>▶</span>
                  {sources.length} source{sources.length > 1 ? "s" : ""} from the
                  document
                </button>

                {showSources && (
                  <ul className="sources-list">
                    {sources.map((s, i) => (
                      <li key={i} className="source-item">
                        <div className="source-head">
                          <span className="source-doc" title={s.document}>
                            📄 {s.document ?? "document"}
                          </span>
                          <span
                            className="source-score"
                            title="Similarity of this passage to your question"
                          >
                            {Math.round(s.score * 100)}% match
                          </span>
                        </div>
                        <div className="score-bar" aria-hidden="true">
                          <span
                            className="score-fill"
                            style={{ width: `${Math.round(s.score * 100)}%` }}
                          />
                        </div>
                        <p className="source-text">{s.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
