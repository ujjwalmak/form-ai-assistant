---
title: Projektstand
---

<div class="fa-page-hero" markdown>
<span class="fa-kicker">Status & Reflexion</span>

# Wo FormAssist heute steht

<p class="fa-lede" markdown>
Alle behandelten Pflicht-Einheiten (E2–E11) sind erfüllt bzw. einvernehmlich erlassen (E5).
Diese Seite fasst den Kursstand zusammen — die ausführliche, laufend gepflegte Quelle ist
[der vollständige Projektstand](reference/projektstand-vollstaendig.md).
</p>
</div>

## Stand nach Kurseinheiten

| Einheit | Thema | Status |
|---|---|:-:|
| E2 | Vibe Coding (Regeln/Personas) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E3 | Agentic Coding | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E4 | Datenbanken & RAG (Supabase) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E5 | Deployment & CI/CD | <span class="fa-pill fa-pill--waived">erlassen</span> |
| E6 | LLM-APIs (Groq + OpenRouter) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E7 | Zwischenpräsentation | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E8 | Testen & Debuggen (133 Tests, CI) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E9 | Orchestrierung (Doku-Agent) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E10 | Stakeholder-Interaktion (diese Webseite) | <span class="fa-pill fa-pill--ok">erfüllt</span> |
| E11 | Model Context Protocol (MCP) | <span class="fa-pill fa-pill--concept">Konzept</span> |

E11 wurde als Konzept behandelt und bringt keinen neuen Pflichtpunkt für den Prototyp.

<div class="fa-section-head" markdown>
<span class="fa-kicker">Reflexion</span>

## Deployment (E5) — warum erlassen
</div>

<div class="fa-panel" markdown>
Die Kurs-Anforderung „Prototyp über eine Plattform bereitgestellt" zielt auf Web-Apps
(z. B. Vercel/Render). FormAssist ist jedoch eine **Chrome-Extension — Client-Code ohne
eigenen Server**. In Absprache mit Prof. Dünnebeil wurde ein klassisches PaaS-Deployment
für diesen Fall als nicht erforderlich eingestuft.

Zwei Aspekte tragen diese Entscheidung:

- **Supabase** deckt den Managed-Plattform-Aspekt (persistente, gehostete Daten)
  teilweise ab.
- Diese **Projektwebseite via GitHub Pages** ist selbst ein veröffentlichtes, deploytes
  Artefakt — sie demonstriert den Deployment-Gedanken ohne einen künstlichen Server für
  die Extension.
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Transparenz</span>

## Was bewusst (noch) nicht enthalten ist
</div>

<div class="fa-limits" markdown>

<div class="fa-limit" markdown>
**Backend-Proxy & Consent-Flow**

Kein Backend-Proxy für API-Keys und kein per-Form-Consent-Flow — für produktiven Betrieb
nötig, für den Prototyp bewusst zurückgestellt.
</div>

<div class="fa-limit" markdown>
**„Echtes" RAG**

Kein pgvector über persönliche Dokumente — als Ausbauidee dokumentiert.
</div>

<div class="fa-limit" markdown>
**Voice-Input**

Bewusst nicht für die Live-Demo umgesetzt, weil Mikrofon-Berechtigungen demo-riskant sind.
</div>

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Changelog</span>

## Neu seit v2.1
</div>

<div class="fa-timeline" markdown>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">05.07.2026</span> **Release v2.1 — Demo-Paket**

Dokument-Scan per Vision-OCR im Profil-Panel mit Privacy-Bestätigung und Review vor dem
Speichern. Live-Validierung beim Tippen: IBAN mod-97, BIC, E-Mail, PLZ, Telefon,
Geburtsdatum. Erweiterter Submit-Review mit Logik-Check auf Widersprüche zwischen Feldern.
</div>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">05.07.2026</span> **Robustere Formularerkennung**

Verschachtelte Shadow Roots, same-origin iFrames, Tabellen-Labels, Fehl-Match-Schutz und
priorisiertes Select-Matching.
</div>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">07.07.2026</span> **Custom-Widget-Support**

ARIA-Comboboxen (React-Select, MUI …) und contenteditable-Rich-Text-Felder werden erkannt
und ausgefüllt; Rückfragen nur noch bei Pflichtfeldern (optionale Felder werden leer
gelassen und gesammelt gemeldet).
</div>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">07.07.2026</span> **Tests verifiziert**

**133/133 grün**, Branch-Coverage ~77 %.
</div>

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Roadmap</span>

## Ausblick
</div>

<div class="fa-timeline" markdown>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">02.07.2026</span> **Reflexions-Präsentation — gehalten**

Interview-Stil: Problem, Herausforderungen, Rollenverteilung, Tools, Lerneffekte.
</div>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">09.07.2026</span> **Prototyp-Demo**

10–15 Min Live-Demo, Repo bereitstellen, Präsentation auf Moodle; v2.1-Features gezielt
zeigen.
</div>

<div class="fa-timeline__item" markdown>
<span class="fa-timeline__date">optional</span> **MCP-Ausbau**

Der `doc-agent` ließe sich zusätzlich als MCP-Server anbieten — verbindet die Themen
Orchestrierung (E9) und MCP (E11).
</div>

</div>

!!! note
    Alle behandelten Pflicht-Einheiten (E2–E11) sind erfüllt bzw. einvernehmlich erlassen
    (E5). E11 (MCP) wurde als Konzept behandelt und bringt keinen neuen Pflichtpunkt für
    den Prototyp.
