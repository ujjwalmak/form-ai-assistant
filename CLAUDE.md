# CLAUDE.md — Projektregeln FormAssist

Regeldatei für das KI-gestützte Arbeiten am **Extension-Repo** (Kurs-Einheit 2 „Vibe Coding":
*projektspezifische Regeldateien / Personas*). Volle Feature-/Architektur-Doku steht in
[README.md](README.md); diese Datei enthält nur die verbindlichen Arbeitsregeln.

> Hinweis: `test-site/CLAUDE.md` + `test-site/AGENTS.md` gelten **nur** für die Next.js-Testseite,
> nicht für den Extension-Code hier im Root.

## Was das ist

Chrome Extension (Manifest V3, Vanilla JS, **kein Build-Step**). Content-Script-Module + Service
Worker. Direkt als „entpackte Erweiterung" ladbar — kein Bundler, keine Transpilation, keine
npm-Dependencies zur Laufzeit.

## Architektur-Regeln

- **Modul-Ladereihenfolge ist fix** (siehe `manifest.json` → `content_scripts.js`):
  `fa-utils` → `fa-profile` → `fa-scanner` → `fa-fill` → `fa-styles` → `fa-supabase` → `content`.
  Reihenfolge nicht ändern; spätere Module setzen frühere voraus (kein Modulsystem, globaler Scope).
- **Jede Datei hat einen klaren Zweck** (Tabelle in `README.md`). Neue Logik in das passende Modul,
  nicht alles in `content.js` kippen.
- **Alle UI-Elemente laufen im Shadow Root** (`attachShadow({ mode: 'open' })`) — kein CSS/DOM-Leck
  auf die Host-Seite. Styles ausschließlich über `FA_CSS` in `fa-styles.js`.
- **Netzwerk nur über `background.js`** (Service Worker). Content-Scripts machen keine direkten
  `fetch`-Calls an LLM-Provider (CSP-/CORS-sicher). LLM: Groq (primär) + OpenRouter (Fallback).

## Konventionen

- **Storage-Keys und Klassennamen nicht ohne Grund umbenennen** — bricht bestehende Code-Pfade,
  gespeicherte Profile und Migrationen. Key-Liste steht in `README.md`.
- **Doku-Sprache: Deutsch.** Ausnahme: `TESTING_PLAN.md` ist Englisch.
- Vanilla JS im bestehenden Stil; keine Frameworks/Build-Tools für den Extension-Code einführen.
- Neue `host_permissions`/`permissions` nur wenn nötig und im PR begründen.

## Sicherheit (Formular-Assistent mit Personendaten)

- **API-Keys gehören in `chrome.storage.sync`, niemals ins Repo** (auch nicht in Beispiel-/Testdateien).
- Profil- und Formularinhalte gehen an den gewählten LLM-Provider — das ist bewusst, aber bei
  Änderungen am Daten-/Prompt-Fluss prüfen, *welche* Daten gesendet werden (Datenminimierung).
- Agent darf **niemals automatisch absenden** (kein `submit`); das ist eine harte Guardrail im
  Action-Parser und bleibt so.

## KI-Workflow (Kurs-Einheiten 2 & 4)

- **Quelle der Wahrheit** ist der Code + `memory/long_term.md` / `memory/decisions.md` —
  nichts erfinden, Behauptungen am Code verifizieren.
- Größere Entscheidungen in `memory/decisions.md`, offene Punkte in `memory/short_term.md` /
  `memory/known_issues.md`, abgeschlossene Sessions als Zusammenfassung in `logs/actions.md`
  (kein Detailspam).
- Wiederverwendbare Rollen-Prompts liegen in [personas/](personas/) — vor einer Aufgabe die
  passende Persona als Kontext geben.
- Projektstatus gegenüber dem Kurs: `Projektstand.md` aktuell halten.
