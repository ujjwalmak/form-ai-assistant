---
name: ui-paradigm-shift
description: Google-inspired action-panel-first UI redesign — sidebar structure, component hierarchy, and chat role
metadata:
  type: project
---

Redesigned from chat-first to action-panel-first layout (2026-05-14).

**Why:** Research into Google's Gemini/Workspace AI patterns showed action-focused sidepanels (suggest → interact → insert) outperform chat interfaces for form-filling tools. User agreed and requested the rebuild.

**New sidebar structure (top→bottom):**
1. Header (64px) — logo + page title as subtitle + icon buttons
2. Action Panel — big "Formular ausfüllen" primary button + "Erklären" chip + "N Felder" collapsible chip
3. Messages/Results area (flex:1) — empty state → agent preview → AI responses → status
4. Input area — slim textarea + send button + dynamic footer (Groq · model · shortcut)

**Message bubble style:**
- User messages: left-aligned gray pill chips (not blue right-aligned bubbles)
- AI messages: full-width white card (border-radius 14px, max-width 100%)
- Empty state: centered subtle text, removed when first content appears

**Key removed elements:**
- `quick-strip` (replaced by action-panel)
- `greet()` function and `hasGreeted` flag (action panel handles context display)
- `greetingBubble/TextEl/ToggleBtn/ListEl` vars (field list now in action-panel collapsible)
- `updateGreetingMessage()` → `updateActionPanel()`
- `renderGreetingFieldList()` → `renderActionFieldList()` (targets `#fa-ap-field-inner`)
- `dismissWelcome()` → `dismissEmpty()` (targets `#fa-results-empty`)
- `updateTriggerVisibility()` (replaced by `updateActionPanel()` disabled state)

**How to apply:** Any new feature that shows context or triggers the agent should go into the action-panel area, not the messages area. Chat input remains but is visually secondary.
