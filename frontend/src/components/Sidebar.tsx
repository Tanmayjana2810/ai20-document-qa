// The left sidebar: the "New Chat" button and the "Chat History" list.
// Each past conversation (session) is shown here; clicking one opens it.

import type { Session } from "../types";

interface Props {
  sessions: Session[];
  activeId: string;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function Sidebar({ sessions, activeId, onNewChat, onSelect, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <button className="new-chat" onClick={onNewChat}>
        + New Chat
      </button>

      <div className="history-label">Chat History</div>

      <nav className="history">
        {sessions.length === 0 && <p className="empty">No conversations yet.</p>}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`history-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="history-title">{s.title || "New chat"}</span>
            <button
              className="delete-btn"
              title="Delete conversation"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">AI20 Labs · Document Q&amp;A</div>
    </aside>
  );
}
