# Projektstand & Reflexion

Diese Seite fasst den Kursstand zusammen. Die ausführliche, laufend gepflegte Quelle ist
[der vollständige Projektstand](reference/projektstand-vollstaendig.md).

## Stand nach Kurseinheiten

| Einheit | Thema | Status |
|---|---|:-:|
| E2 | Vibe Coding (Regeln/Personas) | ✅ |
| E3 | Agentic Coding | ✅ |
| E4 | Datenbanken & RAG (Supabase) | ✅ |
| E5 | Deployment & CI/CD | ➖ erlassen |
| E6 | LLM-APIs (Groq + OpenRouter) | ✅ |
| E7 | Zwischenpräsentation | ✅ |
| E8 | Testen & Debuggen (133 Tests, CI) | ✅ |
| E9 | Orchestrierung (Doku-Agent) | ✅ |
| E10 | Stakeholder-Interaktion (diese Webseite) | ✅ |
| E11 | Model Context Protocol (MCP) | ✅ Konzept (kein neuer Pflichtpunkt) |

## Reflexion: Deployment (E5)

Die Kurs-Anforderung „Prototyp über eine Plattform bereitgestellt" zielt auf Web-Apps
(z. B. Vercel/Render). FormAssist ist jedoch eine **Chrome-Extension — Client-Code ohne
eigenen Server**. In Absprache mit Prof. Dünnebeil wurde ein klassisches PaaS-Deployment für
diesen Fall als nicht erforderlich eingestuft.

Zwei Aspekte tragen diese Entscheidung:

- **Supabase** deckt den Managed-Plattform-Aspekt (persistente, gehostete Daten) teilweise ab.
- Diese **Projektwebseite via GitHub Pages** ist selbst ein veröffentlichtes, deploytes
  Artefakt — sie demonstriert den Deployment-Gedanken ohne einen künstlichen Server für die
  Extension.

## Was bewusst (noch) nicht enthalten ist

- Kein Backend-Proxy für API-Keys und kein per-Form-Consent-Flow → für produktiven Betrieb
  nötig, für den Prototyp bewusst zurückgestellt.
- Kein „echtes" RAG (pgvector über persönliche Dokumente) — als Ausbauidee dokumentiert.
- Kein Voice-Input — bewusst nicht für die Live-Demo umgesetzt, weil Mikrofon-Berechtigungen
  demo-riskant sind.

## Neu seit v2.1 (05.07.2026)

- Dokument-Scan per Vision-OCR im Profil-Panel mit Privacy-Bestätigung und Review vor dem Speichern.
- Live-Validierung beim Tippen: IBAN mod-97, BIC, E-Mail, PLZ, Telefon, Geburtsdatum.
- Erweiterter Submit-Review mit Logik-Check auf Widersprüche zwischen Feldern.
- Robustere Formularerkennung: verschachtelte Shadow Roots, same-origin iFrames,
  Tabellen-Labels, Fehl-Match-Schutz und priorisiertes Select-Matching.
- Custom-Widget-Support (07.07.): ARIA-Comboboxen (React-Select, MUI …) und
  contenteditable-Rich-Text-Felder werden erkannt und ausgefüllt; Rückfragen nur noch
  bei Pflichtfeldern (optionale Felder werden leer gelassen und gesammelt gemeldet).
- Tests verifiziert am 07.07.2026: **133/133 grün**, Branch-Coverage ~77 %.

## Ausblick

- **Reflexions-Präsentation** (02.07.): gehalten; Interview-Stil — Problem, Herausforderungen, Rollenverteilung, Tools, Lerneffekte.
- **Prototyp-Demo** (09.07.): 10–15 Min Live-Demo, Repo bereitstellen, Präsentation auf Moodle; v2.1-Features gezielt zeigen.
- **Optional (MCP):** der `doc-agent` ließe sich zusätzlich als MCP-Server anbieten — verbindet die Themen Orchestrierung (E9) und MCP (E11).

!!! note
    Alle behandelten Pflicht-Einheiten (E2–E11) sind erfüllt bzw. einvernehmlich erlassen (E5).
    E11 (MCP) wurde als Konzept behandelt und bringt keinen neuen Pflichtpunkt für den Prototyp.
