# Technische Entscheidungen & Kompetenzen

Diese Seite zeigt, *wie* im Projekt gearbeitet wurde — Problemstellungen, getroffene
Entscheidungen und ihre Begründung. Sie ist aus dem Entscheidungslog (`memory/decisions.md`)
abgeleitet und richtet sich an Leser, die die dahinterstehende **Arbeitsweise und Kompetenz**
einschätzen wollen.

## Architektur: Single-File + Shadow DOM

**Problem:** Content-Scripts, die direkt ins DOM injizieren, geraten in CSS-Konflikte mit der
Host-Seite (Bootstrap, Tailwind, eigenes CSS).

**Entscheidung:** Die gesamte UI läuft in einem **Shadow DOM** (`attachShadow`), die Laufzeit
als ein orchestrierendes `content.js` statt verteilter Module ohne Isolation.

**Kompetenz:** Abwägen konkurrierender Ansätze (iFrame vs. CSS-Namespacing vs. Shadow DOM)
und Entscheidung anhand von Isolations- und Kommunikationskosten.

## Constraints meistern: Provider-Wahl & automatischer Fallback

**Problem:** Die ursprüngliche Anthropic-Anbindung lief in Credit-Limits; zudem hat jeder
Provider Ausfälle (Groq: 429 Rate-Limit, gelegentliche 503).

**Entscheidung:** Wechsel auf **Groq** (kostenloser, schneller, OpenAI-kompatibler Tier) und ein
**automatischer Fallback auf OpenRouter** bei 429/5xx — inklusive Modell-ID-Normalisierung und
Nutzer-Feedback per Toast.

**Kompetenz:** Umgang mit realen Betriebs-Constraints (Kosten, Rate-Limits, Ausfälle) durch
robuste, transparente Fehlerbehandlung statt Schönwetter-Code.

## Iteratives Problemlösen: vom Batch-Prompt zum Field-by-Field-Agent

**Problem:** Ein einzelner großer Batch-Prompt ignorierte gelernte Felder/Extras, weil der
Kontext zu groß wurde — die Vorschläge wurden ungenau.

**Entscheidung (mehrstufig):** Erst eine Konfidenz-Schwelle, dann ihr Ersatz durch einen
**Field-by-Field-Agenten** (Profil/Extras zuerst per Label-Match, KI nur für wirklich
Unbekanntes), später ergänzt um **Batching** (1 API-Call statt 1 pro Feld) mit Einzelfeld-Fallback.

**Kompetenz:** Eine Lösung nicht beim ersten Wurf festklopfen, sondern an Messpunkten
nachschärfen — und dabei frühere Erkenntnisse bewusst erhalten.

## Qualitätssicherung trotz „klassischer" Skripte

**Problem:** Die Extension-Module sind klassische Content-Scripts (globaler Scope, feste
Ladereihenfolge, kein `import`/`export`) — schwer testbar ohne Umbau.

**Entscheidung:** **Vitest (jsdom)** mit einem browser-sicheren `module.exports`-Shim pro Datei
und jsdom-Polyfills — **69 Tests**, ~77 % Branch-Coverage, CI bei jedem Push. Kein Umbau der
Laufzeit nötig.

**Kompetenz:** Testbarkeit herstellen, ohne die Architektur zu brechen; pragmatische Lösung
statt großem Refactor.

## Agenten-Orchestrierung: der Dokumentations-Agent

**Problem:** Doku läuft im Projektalltag dem Code hinterher.

**Entscheidung:** Ein eigenständiger **DocumentationAgent** (`git diff → LLM → Markdown`) als
Flask-Microservice via JSON-RPC, ausgelöst durch einen **`post-commit`-Git-Hook** — die Doku
schreibt sich nach jedem Commit selbst fort (mit Self-Exclude, damit er sich nicht selbst
dokumentiert).

**Kompetenz:** Konzepte aus der Lehre (Agenten-Rollen, Tool-/LLM-Layer, A2A) eigenständig in
ein lauffähiges, orchestriertes Werkzeug überführen.

## Transparenz & Kommunikation

Entscheidungen werden in `memory/decisions.md` mit Kontext, Alternativen und Konsequenzen
festgehalten; Sessions in `logs/actions.md`; der Projektstatus in `Projektstand.md`. Diese
Webseite selbst ist Teil davon — Kommunikation der eigenen Arbeit als bewusster Bestandteil.

## Team

Das Projekt entstand in Zusammenarbeit von **Maximilian Plitzko** und **Ujjwal Makkar**
(2er-Team, Modul AI-Prototyping).
