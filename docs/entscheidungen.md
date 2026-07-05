# Technische Entscheidungen & Kompetenzen

Diese Seite zeigt, *wie* im Projekt gearbeitet wurde — Problemstellungen, getroffene
Entscheidungen und ihre Begründung. Sie ist aus dem Entscheidungslog (`memory/decisions.md`)
abgeleitet und richtet sich an Leser, die die dahinterstehende **Arbeitsweise und Kompetenz**
einschätzen wollen.

## Architektur: Single-File + Shadow DOM

**Problem:** Content-Scripts, die direkt ins DOM injizieren, geraten in CSS-Konflikte mit der
Host-Seite (Bootstrap, Tailwind, eigenes CSS).

**Entscheidung:** Die gesamte UI läuft in einem **Shadow DOM** (`attachShadow`), die Laufzeit
als feste Content-Script-Modulfolge mit einem orchestrierenden `content.js`.

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
und jsdom-Polyfills — **118 Tests**, 78,93 % Branch-Coverage (~79 %), CI bei jedem Push. Kein Umbau der
Laufzeit nötig.

**Kompetenz:** Testbarkeit herstellen, ohne die Architektur zu brechen; pragmatische Lösung
statt großem Refactor.

## Demo-Paket v2.1: Validierung, Logik-Check, Dokument-Scan

**Problem:** Für die Abschlussdemo sollte der Prototyp sichtbarer, robuster und trotzdem
risikoarm werden: mehr Hilfe vor dem Absenden, weniger Fehlbefüllungen, schnelleres
Profil-Anlegen.

**Entscheidung:** Drei Backlog-Ideen wurden umgesetzt: deterministische Live-Validierung
beim Tippen, ein erweiterter Submit-Review mit Logik-Check und ein Dokument-Scan per
Vision-OCR. Bilder werden clientseitig verkleinert und erst nach expliziter Bestätigung
an den Provider gesendet; erkannte Werte werden nur vorbefüllt.

**Kompetenz:** KI dort einsetzen, wo sie Mehrwert bringt, aber mathematische Prüfungen
lokal und deterministisch halten. Das Ergebnis ist demonstrierbar, testbar und mit
klaren Datenschutz-Gates versehen.

## Robustheits-Paket: lieber fragen als falsch füllen

**Problem:** Fremde Webseiten nutzen Shadow DOM, same-origin iFrames, Tabellenlayouts,
Custom-Widgets und uneindeutige Labels. Substring-Matching konnte falsche Profilwerte
zuordnen.

**Entscheidung:** Root-korrekte DOM-Lookups, rekursiver Shadow-DOM-Scan, Tabellen-Label-
Fallback, Wortanfang-Matching für Profil-Keywords und priorisiertes Select-Matching.
Passwortfelder werden grundsätzlich nicht mit Profildaten gefüllt.

**Kompetenz:** False Positives aktiv reduzieren. Unsichere Felder gehen lieber an den
Agenten oder an eine Rückfrage, statt dauerhaft falsche Daten ins Profil zu lernen.

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
festgehalten; Sessions in `logs/actions.md`; der vollständige Projektstatus in
[`docs/reference/projektstand-vollstaendig.md`](reference/projektstand-vollstaendig.md).
Diese Webseite selbst ist Teil davon — Kommunikation der eigenen Arbeit als bewusster Bestandteil.

## Team

Das Projekt entstand in Zusammenarbeit von **Maximilian Plitzko** und **Ujjwal Makkar**
(2er-Team, Modul AI-Prototyping).
