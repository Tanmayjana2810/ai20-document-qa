// The top-level component. It wires the sidebar (chat history + New Chat) to
// the main chat window, and holds the "currently uploaded document" + "use web"
// toggle state.

import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatWindow } from "./components/ChatWindow";
import { UploadPanel } from "./components/UploadPanel";
import { useSessions } from "./hooks/useSessions";
import { api } from "./api";
import type { Message } from "./types";

export default function App() {
  const {
    sessions,
    active,
    activeId,
    newChat,
    selectSession,
    clearChat,
    deleteSession,
    addMessage,
  } = useSessions();

  const [docName, setDocName] = useState<string | null>(null);
  const [useWeb, setUseWeb] = useState(false);
  const [webAvailable, setWebAvailable] = useState(false);
  const [sending, setSending] = useState(false);

  // On load, ask the backend whether the Dappier web tool is configured, so we
  // only show the toggle when it actually works.
  useEffect(() => {
    api
      .health()
      .then((h) => setWebAvailable(h.web_tool))
      .catch(() => setWebAvailable(false));
  }, []);

  async function handleAsk(question: string) {
    const userMsg: Message = {
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);
    setSending(true);
    try {
      const res = await api.ask(activeId, question, useWeb);
      addMessage({
        role: "assistant",
        content: res.answer,
        createdAt: new Date().toISOString(),
        grounded: res.grounded,
      });
    } catch (err) {
      addMessage({
        role: "assistant",
        content: `⚠️ Error contacting the server: ${(err as Error).message}`,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app">
      <Sidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={newChat}
        onSelect={selectSession}
        onDelete={deleteSession}
      />
      <main className="main">
        <header className="topbar">
          <div>
            <h1>Document Q&amp;A</h1>
            <p className="subtitle">
              {docName ? `Active document: ${docName}` : "Upload a PDF or .txt to begin"}
            </p>
          </div>
          <UploadPanel onUploaded={setDocName} />
        </header>

        <ChatWindow
          messages={active?.messages ?? []}
          sending={sending}
          onAsk={handleAsk}
          onClear={clearChat}
          useWeb={useWeb}
          onToggleWeb={setUseWeb}
          webAvailable={webAvailable}
        />
      </main>
    </div>
  );
}
