# Reflexion — FormAssist

**Präsentation zur Reflektion · 02.07.2026 · 15 Minuten pro Team**
Gliederung entlang der acht Leitfragen aus der Vorlesung (angelehnt an ein Vorstellungsgespräch).

> **Hinweise zur Präsentation**
>
> - **Zeit:** ~15 Min für 8 Fragen → grob 1,5–2 Min pro Frage. Nicht jede Frage gleich lang; bei 2, 5, 7 ruhig mehr Tiefe.
> - **Sprecher-Aufteilung (Vorschlag, anpassbar):** Maximilian → Fragen 1, 2, 5, 8 · Ujjwal → Fragen 3, 4, 6, 7.
> - **Pro Folie:** die **fett** markierte Kernaussage ist der rote Faden; die Stichpunkte sind Sprechnotizen, keine abzulesenden Sätze.
> - **Ergänzen:** Mit `> **Ergänzung:**` markierte Zeilen sind Platzhalter — Ujjwal kann sie füllen oder löschen. Eigenes Beispiel / eigene Perspektive ist überall willkommen.

## Eckdaten

- **Zeitraum:** ~11 Wochen (09.04.–25.06.2026), 52 Commits
- **Team:** 2 Personen (Maximilian 35 · Ujjwal 20 Commits)
- **Produkt:** Chrome-Extension (Manifest V3, Vanilla JS, kein Build-Step; 7 Module; Shadow-DOM-UI)
- **Stack:** Groq + OpenRouter (LLM mit automatischem Fallback) · Supabase (DB) · 69 Unit-Tests (~77 % Coverage) + CI
- **Extras:** eigener Doku-Agent (Flask/JSON-RPC + Git-Hook) · Stakeholder-Webseite (MkDocs) via GitHub Pages

---

## 1. Welches Problem wollten Sie mit Ihrem Prototypen lösen?

**Kernaussage:** Komplexe Formulare fehlerfrei ausfüllen — Daten gebündelt, in einfacher Sprache erklärt, datensparsam und nie automatisch abgesendet.

- Komplexe Browserformulare sind oft schwer verständlich — Behördendeutsch und Rechtssprache führen zu Fehlern.
- Die nötigen Angaben liegen verstreut: Rentenversicherungsnummer auf Papier, Ausweis in der Cloud, Immatrikulationsbescheinigung in Primuss, Krankenkassen-Bestätigung im E-Mail-Postfach.
- **Unsere Lösung:** alle Daten in *einer* Anwendung bündeln und beim Ausfüllen geführt unterstützen.
- **Kern ist die *korrekte* Eingabe**, nicht nur Bequemlichkeit: Felder semantisch auslesen (nicht bloß HTML-Scan), in einfacher Sprache erklären, datensparsam übertragen und **nie automatisch absenden** (harte Sicherheits-Guardrail).

> **Ergänzung:** *…*

## 2. Was war die größte Herausforderung in Ihrem Projekt?

**Kernaussage:** Formulare über sehr unterschiedliche Seiten zuverlässig lesen/füllen — und den Agenten dazu bringen, Gelerntes wiederzuverwenden statt neu zu fragen.

- **Richtung & Mehrwert:** Was bauen wir, wohin soll es gehen, und wie entsteht echter Mehrwert?
- **Technisch:** Formulare zuverlässig über sehr heterogene Seiten lesen und füllen — Shadow DOM, Custom-Widgets (Kendo), Datepicker-Libraries, cross-origin iFrames.
- **Gelerntes nutzen statt neu fragen:** Den Agenten dazu zu bringen, bekannte Antworten wiederzuverwenden, kostete mehrere Umbauten — Konfidenz-Schwelle → Field-by-Field → Batch-Prompt.
- **War Story – Constraints meistern:** Provider-Odyssee von Anthropic (Credit-Limits) über Gemini zu **Groq**, ergänzt um **OpenRouter als automatischen Fallback** bei Rate-Limit oder Ausfall.

> **Ergänzung:** *…*

## 3. Welche Rollenverteilung hatten Sie im Team?

**Kernaussage:** Zusammenarbeit auf Augenhöhe, keine festen Silos — Aufgaben wöchentlich nach Bedarf neu verteilt.

- Zusammenarbeit auf Augenhöhe, keine starre Rollenfestlegung.
- Wöchentliche Reviews mit Neuverteilung der Aufgaben je nach Bedarf.
- Deckt sich mit dem Commit-Bild (beide durchgängig aktiv) — geteilte Verantwortung statt fester Silos.
- Bei 2 Personen empfehlenswert; bei größeren Teams kritisch zu hinterfragen.

> **Ergänzung:** *…*

## 4. Welche Tools haben Sie genutzt?

**Kernaussage:** Mehrere KI-Assistenten im Vergleich getestet — Claude Code (Opus) klar am stärksten; dazu ein schlanker Produkt-Stack.

### Coding-Assistenten

- **VS Code** als Editor.
- **GitHub Copilot** (Student): Limits trotzdem aufgebraucht, Qualität nicht ganz überzeugend — für kleine Aufgaben sinnvoll.
- **Codex** (Free): gute Ergebnisse, Free-Tier schnell aufgebraucht.
- **Gemini** (Free): schnell, Ergebnisse okay (besser als Copilot).
- **Claude Code** (Paid): sehr gute Ergebnisse (besonders Opus); arbeitet oft lange (>10 Min); Token-Limits trotz Paid-Version stoppen den Prozess abrupt, fortsetzbar erst nach Reset; Fable 5 anfangs beeindruckend, dann für uns nicht mehr verfügbar.

### Produkt-Stack

- Groq + OpenRouter (LLM-APIs mit Fallback), Supabase (DB), Vitest (Tests), GitHub Actions (CI), MkDocs Material (Webseite), Flask (Doku-Agent), Git/GitHub.

> **Ergänzung:** *…*

## 5. Wo haben Sie die meiste Zeit verloren?

**Kernaussage:** Token-/Rate-Limits, Anforderungsstrukturierung und die Zuverlässigkeit des Form-Fillings über fremde Seiten.

- Entwicklungspausen durch Token- und Rate-Limits (v. a. Claude Code).
- Strukturierung der Anforderungen.
- Projektmanagement, Dokumentation und „alles drumherum".
- **Zuverlässigkeit des Form-Fillings** über fremde Seiten — mehrere Agent-Iterationen, bis Profil und gelernte Daten verlässlich genutzt wurden.
- **War Story:** GitHub-Push-Protection blockierte einen versehentlich hardcodierten API-Key — Umbau (Key auslagern) kostete Zeit, war aber eine gute Lektion zu Secrets-Management.

> **Ergänzung:** *…*

## 6. Was hat Ihnen gefehlt, um bessere Ergebnisse zu liefern?

**Kernaussage:** Eine früher klar definierte Vorgehensweise und mehr konkrete Beispiele/Referenz-Architekturen in der Vorlesung.

- Eine von Anfang an klarer definierte Vorgehensweise.
- „Wo Sie nach der Einheit stehen sollten" war hilfreich — noch hilfreicher wären klarere Richtung und konkrete Beispiele bzw. Referenz-Architekturen in der Vorlesung gewesen.

> **Ergänzung:** *…*

## 7. Was waren Ihre größten Lerneffekte für zukünftige Projekte?

**Kernaussage:** Klassische Methodik wird durch KI *wichtiger*, nicht überflüssig — und „KI managen" (Kontext, Review, Doku) ist eine eigene Kompetenz.

- Klassische Methoden (Anforderungsdefinition, Stakeholder einbinden, Mockups) sind durch KI **noch wichtiger** geworden.
- **Nachvollziehbarkeit & Doku der KI-Arbeit** ist eigener Aufwand — wir haben dafür ein Memory-/Entscheidungslog *und* einen automatisierten Doku-Agenten gebaut.
- „KI managen" (Kontext geben, Ergebnisse reviewen, festhalten) ist eine eigene Kompetenz.
- **Kontext-Investment zahlt sich aus:** Regeldateien (`CLAUDE.md`), Personas und ein Memory-Log haben die KI-Ergebnisse spürbar verbessert — gute Prompts plus Projektkontext sind Arbeit, die sich lohnt.

> **Ergänzung:** *…*

## 8. Welche Empfehlung würden Sie einer Firma bezüglich AI-Prototyping geben?

**Kernaussage:** Unbedingt nutzen — aber Architektur, Review und Guardrails bleiben menschlich, und Provider-Kosten/Limits von Anfang an einplanen.

- Sehr gutes Mittel, um in wenigen Stunden zu einem Prototyp zu kommen — Prototyping **ohne** KI ist nicht mehr zu empfehlen.
- Der Prototyp taugt als Basis für die Weiterentwicklung; die Ergebnisqualität ist im Verhältnis zum Zeitaufwand sehr hoch.
- Aber: **Architektur- und Richtungsentscheidungen sowie Review bleiben menschlich.**
- **Guardrails und Sicherheit** (API-Keys nie im Code, kein automatisches Absenden) gehören schon in den Prototyp.
- **Provider-Kosten und Limits von Anfang an einplanen:** Free-Tiers sind schnell aufgebraucht, auch Paid-Tiers limitieren — Fallbacks und Budget vorsehen.

> **Ergänzung:** *…*

---

## Bonus — Grenzen & Selbstkritik (für Rückfragen)

> Nicht Teil der 8 Pflichtfragen — als Reserve für mündliche Rückfragen der Jury.

- **Client-seitiger API-Key = nur Prototyp-tauglich:** Der Key liegt im Browser (`chrome.storage.sync`), nicht in einem Backend. Produktiv bräuchte es einen Backend-Proxy plus einen Consent-/Datenschutz-Flow pro Formular.
- **Funktionale Grenzen:** Cross-origin iFrames sind durch die Same-Origin-Policy nicht auslesbar; im nativen Chrome-PDF-Viewer läuft die Extension nicht.
- **Worauf wir stolz sind:** Batch-Agent (1 statt 12 API-Calls pro Formularseite), automatischer Provider-Fallback (Groq → OpenRouter, transparent per Toast), ~77 % Test-Coverage mit CI bei einer Vanilla-JS-Extension ohne Build-Step, autonomer Doku-Agent via Git-Hook.

> **Ergänzung (Ausblick, optional):** *Vision-OCR (Ausweis fotografieren) · echtes RAG über persönliche Dokumente (pgvector) · MCP-Server für den Doku-Agenten.*
