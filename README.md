# AI20 Labs — Intelligent Document Q&A

A full-stack web app where you **upload a PDF or `.txt`**, then **chat with an AI agent** that answers questions using only that document. If the answer isn't in the document, the agent says so instead of making something up — and can optionally search the web.

Built for the AI20 Labs Software Engineer technical assignment.

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Python + FastAPI
- **RAG orchestration:** LlamaIndex
- **Embeddings:** HuggingFace `bge-small-en-v1.5` (local, free — no OpenAI key required)
- **LLM:** Llama-3 via Groq (free API tier)
- **Vector store:** ChromaDB (persistent, on disk)
- **Bonus:** MongoDB session storage, Dappier web access, cookie-based user sessions, GitHub Actions CI/CD, Docker

---

## Demo

- **Live app (frontend):** https://ai20-document-qa.vercel.app
- **Backend API + docs:** https://tanmayai20qa.duckdns.org/docs
- **Video walkthrough:** _add your 1–2 min screen-recording link here (Loom / Google Drive)_

Deployment at a glance: React + TypeScript frontend on **Vercel** (HTTPS), FastAPI
backend in **Docker on AWS EC2**, fronted by **Caddy** for automatic HTTPS.

---

## How it works (architecture)

```
┌─────────────────────────┐         ┌──────────────────────────────────────────┐
│   React + TypeScript     │  HTTP   │            FastAPI backend                 │
│   (Vercel / Netlify)     │ ──────▶ │                                            │
│                          │         │  /upload ─▶ parse ─▶ chunk ─▶ embed ─▶ ┐   │
│  • New Chat              │         │                                       │   │
│  • Chat History (sidebar)│         │                              ChromaDB ◀┘   │
│  • Clear Chat            │         │                              (vectors)     │
│  • localStorage history  │         │  /ask ─▶ embed question ─▶ retrieve top-k  │
│                          │ ◀────── │         ─▶ Llama-3 (Groq) writes answer    │
└─────────────────────────┘         │         ─▶ fallback if nothing relevant    │
                                     │  /sessions ─▶ MongoDB (per-user history)   │
                                     └──────────────────────────────────────────┘
                                              (Docker on AWS EC2)
```

**RAG in one paragraph:** When you upload a document, the backend splits it into
small chunks, converts each into a vector (an embedding that captures meaning),
and stores those vectors in ChromaDB. When you ask a question, it embeds the
question the same way, finds the closest chunks, and asks Llama-3 to answer using
only those chunks. If no chunk is similar enough (below a similarity cutoff), it
returns a clear "I could not find the answer in the document" message.

---

## Repository structure

```
.
├── backend/                 # Python + FastAPI
│   ├── app/
│   │   ├── main.py          # API routes + cookie user sessions
│   │   ├── config.py        # env-based settings
│   │   ├── schemas.py       # request/response models
│   │   ├── rag_engine.py    # LlamaIndex: embed / store / retrieve / generate
│   │   ├── ingest.py        # PDF + txt parsing
│   │   ├── session_store.py # MongoDB chat sessions (in-memory fallback)
│   │   └── web_tool.py      # Dappier web search (optional)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                # React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api.ts           # fetch wrapper for the backend
│   │   ├── types.ts         # shared TS types
│   │   ├── hooks/useSessions.ts   # localStorage persistence + chat actions
│   │   └── components/      # Sidebar, ChatWindow, MessageBubble, UploadPanel
│   └── .env.example
├── .github/workflows/       # CI/CD (backend + frontend)
├── docker-compose.yml       # backend + MongoDB, one command
└── README.md
```

---

## Quick start (local)

### Prerequisites
- Python 3.11+
- Node.js 20+
- A free **Groq API key** → https://console.groq.com/keys (no credit card)
- *(Optional)* Docker, MongoDB, a Dappier key

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then paste your GROQ_API_KEY into .env
uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000** — interactive API docs at
**http://localhost:8000/docs**.

> First run downloads the embedding model (~90 MB). It's cached afterwards.
> No Groq key yet? The app still runs and returns the most relevant chunk verbatim.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env              # defaults to http://localhost:8000
npm run dev
```

Open **http://localhost:5173**, upload a PDF/txt, and start asking questions.

### 3. Everything in Docker (backend + MongoDB)

```bash
# create a .env next to docker-compose.yml with GROQ_API_KEY=...
docker compose up --build
```

Then run the frontend with `npm run dev` as above.

---

## Environment variables

### Backend (`backend/.env`)
| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GROQ_API_KEY` | recommended | — | Powers Llama-3 answers (free tier) |
| `LLM_MODEL` | no | `llama-3.3-70b-versatile` | Which Groq model |
| `EMBED_MODEL` | no | `BAAI/bge-small-en-v1.5` | Local embedding model |
| `SIMILARITY_CUTOFF` | no | `0.35` | Below this, question is "not in document" |
| `MONGO_URI` | no | — | Enables server-side session history |
| `DAPPIER_API_KEY` | no | — | Enables the web-search tool |
| `CORS_ORIGINS` | no | localhost | Allowed frontend origins |

### Frontend (`frontend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness + which optional features are on |
| `POST` | `/api/upload` | Upload & index a PDF/txt (multipart `file`) |
| `POST` | `/api/ask` | `{ session_id, question, use_web }` → answer |
| `GET` | `/api/sessions` | List this user's chat sessions |
| `GET` | `/api/sessions/{id}` | Full history of one session |
| `DELETE` | `/api/sessions/{id}` | Delete a session |

---

## Deployment

### Frontend → Vercel
1. Push this repo to GitHub.
2. On Vercel, "Add New Project" → import the repo → set **Root Directory** to `frontend`.
3. Add env var `VITE_API_URL` = your backend URL (e.g. `http://<ec2-ip>:8000`).
4. Deploy. Vercel auto-runs `npm run build`.

### Backend → AWS EC2 (Docker)
1. Launch an Ubuntu EC2 instance; open ports **22** and **8000** in the security group.
2. SSH in and install Docker:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin
   sudo usermod -aG docker $USER && newgrp docker
   ```
3. Clone the repo, create `.env` with `GROQ_API_KEY` and `CORS_ORIGINS=https://<your-vercel-app>`.
4. `docker compose up --build -d`
5. Backend is live at `http://<ec2-public-ip>:8000`. Point the frontend's
   `VITE_API_URL` at it and redeploy the frontend.

> For HTTPS, put the API behind Nginx or a load balancer with a TLS certificate.

---

## Feature → requirement mapping

| Assignment requirement | Where it's implemented |
|---|---|
| Upload PDF **and** txt | `ingest.py`, `UploadPanel.tsx` |
| LlamaIndex ingest / chunk / embed / index / query | `rag_engine.py` |
| Embeddings (free alternative to OpenAI) | HuggingFace `bge-small-en-v1.5` |
| Store embeddings in ChromaDB | `rag_engine.py` (`ChromaVectorStore`) |
| Fallback when question is unrelated | similarity cutoff in `rag_engine.py` |
| New Chat / Chat History / Clear Chat | `Sidebar.tsx`, `ChatWindow.tsx`, `useSessions.ts` |
| Persist chat across refresh (localStorage) | `useSessions.ts` |
| TypeScript frontend, Python backend | `frontend/` + `backend/` |
| Docker + EC2 | `Dockerfile`, `docker-compose.yml`, this README |
| **Bonus:** Dappier web tool | `web_tool.py`, web toggle in UI |
| **Bonus:** DB session storage + sidebar | `session_store.py` (MongoDB), `Sidebar.tsx` |
| **Bonus:** user session management | cookie `uid` in `main.py` |
| **Bonus:** CI/CD | `.github/workflows/` |

---

## Notes & design choices
- **Why free/local embeddings?** No API key, no cost, fully reproducible — and
  the assignment explicitly allows a free alternative to OpenAI.
- **Why Groq?** Free tier, very fast, and it serves the Llama-3 models — a clean
  fit for a LlamaIndex project.
- **Grounding:** the LLM is instructed to answer only from retrieved context, and
  we additionally gate on a similarity score so off-topic questions never reach it.
- **Two layers of history:** localStorage (required, survives refresh) on the
  client, plus MongoDB (bonus) on the server for cross-device session listing.
