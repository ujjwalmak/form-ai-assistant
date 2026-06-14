"""LLM-Transport für den DocumentationAgent.

Spiegelt den Provider-Aufbau der Extension (background.js): Groq primär,
OpenRouter als automatischer Fallback. OpenAI-kompatibles Format.
Keys kommen ausschließlich aus der Umgebung — niemals aus dem Code.
"""
import os
import sys
import requests


def _log(msg):
    print(msg, file=sys.stderr, flush=True)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"


class LLMError(Exception):
    pass


def chat(prompt, system=None, max_tokens=900, timeout=30):
    """Schickt einen Prompt an Groq; bei Fehler Fallback auf OpenRouter."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    or_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if groq_key:
        try:
            _log(f"   -> Provider: Groq ({GROQ_MODEL})")
            return _call(GROQ_URL, groq_key, GROQ_MODEL, messages, max_tokens, timeout)
        except LLMError as e:
            _log(f"   !! Groq fehlgeschlagen: {e}")
            if not or_key:
                raise
    if or_key:
        _log(f"   -> Fallback: OpenRouter ({OPENROUTER_MODEL})")
        return _call(OPENROUTER_URL, or_key, OPENROUTER_MODEL, messages, max_tokens, timeout)
    raise LLMError("Kein API-Key gesetzt (GROQ_API_KEY oder OPENROUTER_API_KEY).")


def _call(url, key, model, messages, max_tokens, timeout):
    try:
        res = requests.post(
            url,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages,
                  "max_tokens": max_tokens, "temperature": 0.3},
            timeout=timeout,
        )
    except requests.RequestException as e:
        raise LLMError(f"Netzwerkfehler: {e}")
    if not res.ok:
        raise LLMError(f"HTTP {res.status_code}: {res.text[:200]}")
    try:
        return res.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError) as e:
        raise LLMError(f"Unerwartete Antwortstruktur: {e}")
