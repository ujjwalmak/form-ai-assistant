# Projektstand & Reflexion

Diese Seite fasst den Kursstand zusammen. Die ausführliche, laufend gepflegte Quelle ist
`Projektstand.md` im Repository.

## Stand nach Kurseinheiten

| Einheit | Thema | Status |
|---|---|:-:|
| E2 | Vibe Coding (Regeln/Personas) | ✅ |
| E3 | Agentic Coding | ✅ |
| E4 | Datenbanken & RAG (Supabase) | ✅ |
| E5 | Deployment & CI/CD | ➖ erlassen |
| E6 | LLM-APIs (Groq + OpenRouter) | ✅ |
| E7 | Zwischenpräsentation | ✅ |
| E8 | Testen & Debuggen (69 Tests, CI) | ✅ |
| E9 | Orchestrierung (Doku-Agent) | ✅ |
| E10 | Stakeholder-Interaktion (diese Webseite) | 🔄 in Arbeit |
| E11 | Model Context Protocol (MCP) | ⏳ noch nicht behandelt |

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

## Ausblick

- **E10:** Fertigstellung und Veröffentlichung dieser Stakeholder-Webseite.
- **E11 (MCP):** noch nicht behandelt.
- **Abschlusspräsentation** (02. / 09.07.2026): Coding-Ansatz + Reflexion.

!!! note
    `TODO: fachlich klären` — Verbleibende offene Punkte (z. B. konkrete MCP-Umsetzung)
    werden ergänzt, sobald die jeweilige Einheit behandelt wurde.
