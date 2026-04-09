# FormAssist – KI-gestützter Formular-Assistent

A single-page AI assistant prototype that helps users fill out a German residential registration change form (*Ummeldung des Wohnsitzes*) using the Claude API.

![KI-Assistent Prototyp](https://img.shields.io/badge/Status-Prototyp-blue) ![HTML](https://img.shields.io/badge/Stack-HTML%20%2F%20CSS%20%2F%20JS-orange) ![Claude](https://img.shields.io/badge/AI-Claude%20Opus-blueviolet)

---

## Overview

FormAssist is a fully self-contained HTML prototype — no build step, no server, no npm. Open the file in any modern browser and you're done. A sidebar chat powered by **Claude claude-opus-4-5** guides users through the form in real time, answering field-specific questions in natural German.

The form covers the standard German *Einwohnermeldeamt* registration change workflow, including legal references (e.g. § 17 BMG registration deadline).

---

## Features

| Feature | Description |
|---|---|
| **AI Chat Sidebar** | Conversational assistant answers questions about every form field |
| **Contextual Help** | Clicking the `?` icon next to a field automatically asks the AI to explain that field |
| **Field Focus Context** | The AI knows which field is currently active and tailors its answers accordingly |
| **Progress Bar** | Real-time completion tracking across all required fields |
| **Inline Validation** | PLZ (postal code) format validation with visual feedback |
| **Quick-Reply Chips** | Pre-built question chips for common queries (deadlines, documents, etc.) |
| **Simulated Submission** | Submit button triggers a confirmation message (no real backend) |
| **Responsive Layout** | Two-column grid (form + chat), adapts to the viewport |

---

## Form Sections

1. **Persönliche Daten** — Anrede, Titel, Vor-/Nachname, Geburtsdatum/-ort, Staatsangehörigkeit, Familienstand
2. **Bisherige Wohnanschrift** — Straße, Hausnummer, PLZ, Ort, Einzugsdatum
3. **Neue Wohnanschrift** — same fields for the new address + move-in date
4. **Zusätzliche Angaben** — Wohnungsgeberbestätigung, Mitziehende Personen, Bemerkungen

---

## Getting Started

### Prerequisites

- A modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com/)

### Running the App

```bash
# Clone the repository
git clone https://github.com/ujjwalmak/form-ai-assistant.git
cd form-ai-assistant

# Just open the file — no install step needed
open form-ai-assistant.html   # macOS
xdg-open form-ai-assistant.html  # Linux
start form-ai-assistant.html  # Windows
```

Or simply drag `form-ai-assistant.html` into your browser.

### API Key

On first load, the chat sidebar prompts for your Anthropic API key (`sk-ant-…`). The key is stored only in memory for the session — it is never persisted to localStorage or sent anywhere other than the Anthropic API.

> **Note:** The app uses the `anthropic-dangerous-direct-browser-access` header, which is required for direct browser-to-API calls. This is intentional for a prototype but should be replaced by a backend proxy in production.

---

## Architecture

```
form-ai-assistant.html
├── <style>          Embedded CSS (CSS custom properties, responsive grid)
├── <body>
│   ├── <header>     Logo + badge
│   ├── .form-panel  The registration change form (4 sections)
│   └── .chat-panel  AI chat sidebar (message list + input + chips)
└── <script>         Vanilla JS — API calls, validation, progress, event wiring
```

**External dependencies (CDN only, no npm):**
- [DM Sans & DM Mono](https://fonts.google.com/) — typography via Google Fonts
- [Anthropic Messages API](https://docs.anthropic.com/en/api/messages) — `POST /v1/messages`

**Model used:** `claude-opus-4-5`  
**System prompt language:** German  
**Max response length:** ~3 sentences (enforced via system prompt)

---

## Configuration

All tuneable values live at the top of the `<script>` block:

| Variable | Default | Description |
|---|---|---|
| `SYSTEM_PROMPT` | see file | German system prompt for the assistant persona |
| `model` | `claude-opus-4-5` | Anthropic model ID |
| `max_tokens` | `300` | Maximum tokens per AI response |

---

## Limitations & Production Considerations

- **No backend:** The API key is entered by the user and sent directly from the browser. For production, use a server-side proxy to keep your key secret.
- **No persistence:** Form data and chat history are lost on page reload.
- **Simulated submission:** The submit button does not send data anywhere.
- **Single form:** The prototype covers only *Ummeldung des Wohnsitzes*. Other form types would require adapting the system prompt and field definitions.

---

## License

MIT
