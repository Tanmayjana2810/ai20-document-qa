// Shared TypeScript types. These mirror the backend's Pydantic schemas so the
// data shapes match on both sides — this is the "type safety" the assignment asks for.

export type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
  createdAt: string; // ISO timestamp
  grounded?: boolean; // true if the answer came from the document
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: string;
}

// Shape of POST /api/ask response
export interface AskResponse {
  answer: string;
  grounded: boolean;
  sources: { text: string; score: number; document?: string }[];
}

// Shape of POST /api/upload response
export interface UploadResponse {
  filename: string;
  chunks_indexed: number;
  message: string;
}
