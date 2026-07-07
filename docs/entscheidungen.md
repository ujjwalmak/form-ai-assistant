---
title: Entscheidungen
---

<div class="fa-page-hero" markdown>
<span class="fa-kicker">Inside FormAssist</span>

# Entscheidungen, die das Produkt geformt haben

<p class="fa-lede" markdown>
Diese Seite zeigt, *wie* im Projekt gearbeitet wurde — Problemstellungen, getroffene
Entscheidungen und ihre Begründung. Sie ist aus dem Entscheidungslog
(`memory/decisions.md`) abgeleitet und richtet sich an Leser, die die dahinterstehende
**Arbeitsweise und Kompetenz** einschätzen wollen.
</p>
</div>

<div class="fa-decision" markdown>

### Architektur: Single-File + Shadow DOM

<span class="fa-tag fa-tag--problem">Problem</span>
Content-Scripts, die direkt ins DOM injizieren, geraten in CSS-Konflikte mit der
Host-Seite (Bootstrap, Tailwind, eigenes CSS).

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Die gesamte UI läuft in einem **Shadow DOM** (`attachShadow`), die Laufzeit als feste
Content-Script-Modulfolge mit einem orchestrierenden `content.js`.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
Abwägen konkurrierender Ansätze (iFrame vs. CSS-Namespacing vs. Shadow DOM) und
Entscheidung anhand von Isolations- und Kommunikationskosten.

</div>

<div class="fa-decision" markdown>

### Constraints meistern: Provider-Wahl & automatischer Fallback

<span class="fa-tag fa-tag--problem">Problem</span>
Die ursprüngliche Anthropic-Anbindung lief in Credit-Limits; zudem hat jeder Provider
Ausfälle (Groq: 429 Rate-Limit, gelegentliche 503).

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Wechsel auf **Groq** (kostenloser, schneller, OpenAI-kompatibler Tier) und ein
**automatischer Fallback auf OpenRouter** bei 429/5xx — inklusive
Modell-ID-Normalisierung und Nutzer-Feedback per Toast.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
Umgang mit realen Betriebs-Constraints (Kosten, Rate-Limits, Ausfälle) durch robuste,
transparente Fehlerbehandlung statt Schönwetter-Code.

</div>

<div class="fa-decision" markdown>

### Iteratives Problemlösen: vom Batch-Prompt zum Field-by-Field-Agent

<span class="fa-tag fa-tag--problem">Problem</span>
Ein einzelner großer Batch-Prompt ignorierte gelernte Felder/Extras, weil der Kontext
zu groß wurde — die Vorschläge wurden ungenau.

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Mehrstufig: erst eine Konfidenz-Schwelle, dann ihr Ersatz durch einen
**Field-by-Field-Agenten** (Profil/Extras zuerst per Label-Match, KI nur für wirklich
Unbekanntes), später ergänzt um **Batching** (1 API-Call statt 1 pro Feld) mit
Einzelfeld-Fallback.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
Eine Lösung nicht beim ersten Wurf festklopfen, sondern an Messpunkten nachschärfen —
und dabei frühere Erkenntnisse bewusst erhalten.

</div>

<div class="fa-decision" markdown>

### Qualitätssicherung trotz „klassischer" Skripte

<span class="fa-tag fa-tag--problem">Problem</span>
Die Extension-Module sind klassische Content-Scripts (globaler Scope, feste
Ladereihenfolge, kein `import`/`export`) — schwer testbar ohne Umbau.

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
**Vitest (jsdom)** mit einem browser-sicheren `module.exports`-Shim pro Datei und
jsdom-Polyfills — **133 Tests**, Branch-Coverage ~77 %, CI bei jedem Push. Kein Umbau
der Laufzeit nötig.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
Testbarkeit herstellen, ohne die Architektur zu brechen; pragmatische Lösung statt
großem Refactor.

</div>

<div class="fa-decision" markdown>

### Demo-Paket v2.1: Validierung, Logik-Check, Dokument-Scan

<span class="fa-tag fa-tag--problem">Problem</span>
Für die Abschlussdemo sollte der Prototyp sichtbarer, robuster und trotzdem risikoarm
werden: mehr Hilfe vor dem Absenden, weniger Fehlbefüllungen, schnelleres Profil-Anlegen.

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Drei Backlog-Ideen wurden umgesetzt: deterministische Live-Validierung beim Tippen, ein
erweiterter Submit-Review mit Logik-Check und ein Dokument-Scan per Vision-OCR. Bilder
werden clientseitig verkleinert und erst nach expliziter Bestätigung an den Provider
gesendet; erkannte Werte werden nur vorbefüllt.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
KI dort einsetzen, wo sie Mehrwert bringt, aber mathematische Prüfungen lokal und
deterministisch halten. Das Ergebnis ist demonstrierbar, testbar und mit klaren
Datenschutz-Gates versehen.

</div>

<div class="fa-decision" markdown>

### Robustheits-Paket: lieber fragen als falsch füllen

<span class="fa-tag fa-tag--problem">Problem</span>
Fremde Webseiten nutzen Shadow DOM, same-origin iFrames, Tabellenlayouts, Custom-Widgets
und uneindeutige Labels. Substring-Matching konnte falsche Profilwerte zuordnen.

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Root-korrekte DOM-Lookups, rekursiver Shadow-DOM-Scan, Tabellen-Label-Fallback,
Wortanfang-Matching für Profil-Keywords und priorisiertes Select-Matching.
Passwortfelder werden grundsätzlich nicht mit Profildaten gefüllt.

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
False Positives aktiv reduzieren. Unsichere Felder gehen lieber an den Agenten oder an
eine Rückfrage, statt dauerhaft falsche Daten ins Profil zu lernen.

</div>

<div class="fa-decision" markdown>

### Agenten-Orchestrierung: der Dokumentations-Agent

<span class="fa-tag fa-tag--problem">Problem</span>
Doku läuft im Projektalltag dem Code hinterher.

<span class="fa-tag fa-tag--entscheidung">Entscheidung</span>
Ein eigenständiger **DocumentationAgent** (`git diff → LLM → Markdown`) als
Flask-Microservice via JSON-RPC, ausgelöst durch einen **`post-commit`-Git-Hook** — die
Doku schreibt sich nach jedem Commit selbst fort (mit Self-Exclude, damit er sich nicht
selbst dokumentiert).

<span class="fa-tag fa-tag--kompetenz">Kompetenz</span>
Konzepte aus der Lehre (Agenten-Rollen, Tool-/LLM-Layer, A2A) eigenständig in ein
lauffähiges, orchestriertes Werkzeug überführen.

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Arbeitsweise</span>

## Transparenz & Kommunikation
</div>

Entscheidungen werden in `memory/decisions.md` mit Kontext, Alternativen und Konsequenzen
festgehalten; Sessions in `logs/actions.md`; der vollständige Projektstatus in
[`docs/reference/projektstand-vollstaendig.md`](reference/projektstand-vollstaendig.md).
Diese Webseite selbst ist Teil davon — Kommunikation der eigenen Arbeit als bewusster
Bestandteil.

<div class="fa-section-head" markdown>
<span class="fa-kicker">Team</span>

## Wer dahinter steht
</div>

<div class="fa-team">
  <div class="fa-team__card">
    <div class="fa-team__avatar">MP</div>
    <div><strong>Maximilian Plitzko</strong><small>Co-Entwickler · Modul AI-Prototyping</small></div>
  </div>
  <div class="fa-team__card">
    <div class="fa-team__avatar">UM</div>
    <div><strong>Ujjwal Makkar</strong><small>Co-Entwickler · Modul AI-Prototyping</small></div>
  </div>
</div>

Das Projekt entstand in Zusammenarbeit als 2er-Team im Modul **AI-Prototyping**.
