// A single chat bubble. User messages sit on the right, assistant on the left.
// When the assistant answered from OUTSIDE the document (fallback / web), we
// show a small badge so the user knows the source.

import type { Message } from "../types";

interface Props {
  message: Message;
  typing?: boolean;
}

export function MessageBubble({ message, typing }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`bubble-row ${isUser ? "user" : "assistant"}`}>
      <div className={`bubble ${isUser ? "user" : "assistant"}`}>
        {typing ? (
          <span className="typing">
            <span></span>
            <span></span>
            <span></span>
          </span>
        ) : (
          <>
            <div className="bubble-text">{message.content}</div>
            {!isUser && message.grounded === false && (
              <div className="badge not-in-doc">Not found in document</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
