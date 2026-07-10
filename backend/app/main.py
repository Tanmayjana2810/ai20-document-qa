"""
FastAPI application — the HTTP layer.

This file only handles web concerns: receiving requests, calling the engine /
stores, and returning responses. All the heavy logic lives in the other modules.

Endpoints:
  GET    /api/health              quick liveness check
  POST   /api/upload              upload & index a PDF or .txt
  POST   /api/ask                 ask a question about the document(s)
  GET    /api/sessions            list this user's chat sessions (sidebar)
  GET    /api/sessions/{id}       full history for one session
  DELETE /api/sessions/{id}       delete a session

Run locally:  uvicorn app.main:app --reload
Interactive docs:  http://localhost:8000/docs
"""

from __future__ import annotations

import json
import os
import uuid

from fastapi import Cookie, Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import settings
from .ingest import load_document
from .rag_engine import FALLBACK_MSG, engine
from .schemas import (
    AskRequest,
    AskResponse,
    ChatMessage,
    SessionDetail,
    SessionSummary,
    UploadResponse,
)
from .session_store import store
from .web_tool import search_web, web_enabled

app = FastAPI(title="AI20 Labs — Document Q&A API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXT = {".pdf", ".txt"}


# --- Basic user session management (bonus #3) --------------------------------
# We identify each browser with a random id stored in a cookie named "uid".
# It's anonymous (no password), but enough to keep every user's chat sessions
# separate on the server. FastAPI injects this dependency into any route that
# needs the current user.
def current_user(response: Response, uid: str | None = Cookie(default=None)) -> str:
    if not uid:
        uid = uuid.uuid4().hex
        response.set_cookie(
            "uid", uid, max_age=60 * 60 * 24 * 365, samesite="lax", httponly=False
        )
    return uid


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "llm_configured": bool(settings.groq_api_key),
        "web_tool": web_enabled(),
    }


@app.post("/api/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, "Only .pdf and .txt files are supported.")

    os.makedirs(settings.upload_dir, exist_ok=True)
    dest = os.path.join(settings.upload_dir, file.filename)
    with open(dest, "wb") as f:
        f.write(await file.read())

    docs = load_document(dest)
    n_chunks = engine.add_documents(docs)

    return UploadResponse(
        filename=file.filename,
        chunks_indexed=n_chunks,
        message=f"Indexed '{file.filename}' into {n_chunks} chunks.",
    )


@app.post("/api/ask", response_model=AskResponse)
async def ask(body: AskRequest, user_id: str = Depends(current_user)) -> AskResponse:
    # 1) Save the user's message.
    store.upsert_message(
        user_id, body.session_id, ChatMessage(role="user", content=body.question)
    )

    # 2) Try to answer from the uploaded document(s).
    answer, grounded, sources = engine.query(body.question)

    # 3) If it's not in the document and the user allowed web access, try Dappier.
    if not grounded and body.use_web and web_enabled():
        web_answer = search_web(body.question)
        if web_answer:
            answer = web_answer

    # 4) Save the assistant's reply and return it.
    store.upsert_message(
        user_id, body.session_id, ChatMessage(role="assistant", content=answer)
    )
    return AskResponse(answer=answer, grounded=grounded, sources=sources)


@app.post("/api/ask/stream")
async def ask_stream(body: AskRequest, user_id: str = Depends(current_user)) -> StreamingResponse:
    """Same as /api/ask, but streams the answer token-by-token as newline-
    delimited JSON (NDJSON). Each line is one of:
      {"type":"meta","grounded":bool,"sources":[...]}
      {"type":"token","text":"..."}
      {"type":"done"}
    """
    store.upsert_message(
        user_id, body.session_id, ChatMessage(role="user", content=body.question)
    )
    grounded, sources, token_gen = engine.query_stream(body.question)

    def event_stream():
        yield json.dumps(
            {"type": "meta", "grounded": grounded, "sources": [s.model_dump() for s in sources]}
        ) + "\n"

        full = ""
        if token_gen is not None:
            # Grounded: stream the LLM's tokens as they arrive.
            for token in token_gen:
                full += token
                yield json.dumps({"type": "token", "text": token}) + "\n"
        else:
            # Not in the document: fall back to web (if enabled) or the message.
            answer = FALLBACK_MSG
            if body.use_web and web_enabled():
                web_answer = search_web(body.question)
                if web_answer:
                    answer = web_answer
            full = answer
            yield json.dumps({"type": "token", "text": answer}) + "\n"

        store.upsert_message(
            user_id, body.session_id, ChatMessage(role="assistant", content=full)
        )
        yield json.dumps({"type": "done"}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")


@app.get("/api/sessions", response_model=list[SessionSummary])
def list_sessions(user_id: str = Depends(current_user)) -> list[SessionSummary]:
    return store.list_sessions(user_id)


@app.get("/api/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: str, user_id: str = Depends(current_user)) -> SessionDetail:
    detail = store.get_session(user_id, session_id)
    if not detail:
        raise HTTPException(404, "Session not found.")
    return detail


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, user_id: str = Depends(current_user)) -> dict:
    store.delete_session(user_id, session_id)
    return {"deleted": session_id}
