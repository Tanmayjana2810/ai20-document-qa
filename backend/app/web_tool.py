"""
Bonus feature: give the agent access to the live web via Dappier.

Dappier provides a real-time search API. When a user's question can't be
answered from the uploaded document AND they've toggled "use web" on, we ask
Dappier for a current answer instead of returning "I don't know".

This whole module degrades gracefully: if no DAPPIER_API_KEY is set, the web
tool is simply disabled and the app keeps working as a pure document Q&A.
"""

from __future__ import annotations

from .config import settings

# Dappier's default real-time search model.
_REALTIME_MODEL_ID = "am_01j06ytn18ejftedz6dyhz2b15"


def web_enabled() -> bool:
    return bool(settings.dappier_api_key)


def search_web(query: str) -> str | None:
    """Return a web-sourced answer string, or None if unavailable/failed."""
    if not web_enabled():
        return None
    try:
        from dappier import Dappier

        client = Dappier(api_key=settings.dappier_api_key)
        response = client.search_real_time_data(
            query=query, ai_model_id=_REALTIME_MODEL_ID
        )
        return getattr(response, "message", None) or str(response)
    except Exception as exc:  # never let the web tool crash a request
        print(f"[web_tool] Dappier search failed: {exc}")
        return None
