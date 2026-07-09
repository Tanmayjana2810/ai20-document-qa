"""
Central configuration.

Everything that changes between your laptop, Docker, and AWS lives here and is
read from environment variables. Never hard-code secrets (API keys) in code —
they go in a .env file (which is git-ignored) or in the server's environment.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Tell pydantic to load a local .env file automatically during development.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM (Groq serves Llama-3 models on a free tier) ---
    groq_api_key: str = ""
    llm_model: str = "llama-3.3-70b-versatile"

    # --- Embeddings (runs locally, no key needed) ---
    embed_model: str = "BAAI/bge-small-en-v1.5"

    # --- Vector store (ChromaDB, persisted to disk) ---
    chroma_dir: str = "./storage/chroma"

    # --- Retrieval tuning ---
    # If the best-matching chunk scores below this, we treat the question as
    # "not answerable from the document" and return the fallback message.
    similarity_top_k: int = 4
    similarity_cutoff: float = 0.35

    # --- Bonus: MongoDB for per-session chat history ---
    mongo_uri: str = ""                       # empty -> falls back to in-memory
    mongo_db: str = "ai20_qa"

    # --- Bonus: Dappier web access ---
    dappier_api_key: str = ""                 # empty -> web tool disabled

    # --- Uploads ---
    upload_dir: str = "./storage/uploads"

    # --- CORS: which frontend origins may call this API ---
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


# A single shared instance imported everywhere else.
settings = Settings()
