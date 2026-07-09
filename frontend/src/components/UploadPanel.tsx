// The upload control in the top bar. Sends the chosen file to POST /api/upload,
// where the backend parses and indexes it. Shows progress + a success message.

import { useRef, useState } from "react";
import { api } from "../api";

interface Props {
  onUploaded: (filename: string) => void;
}

export function UploadPanel({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const res = await api.upload(file);
      setStatus(res.message);
      onUploaded(res.filename);
    } catch (err) {
      setStatus(`Upload failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button className="upload-btn" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Indexing…" : "Upload document"}
      </button>
      {status && <span className="upload-status">{status}</span>}
    </div>
  );
}
