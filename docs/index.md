---
hide:
  - navigation
  - toc
---

<div class="fa-hero" markdown>

![FormAssist](img/logo.svg){ .fa-hero__logo }

<span class="fa-hero__badge">Studienprojekt · AI-Prototyping SS 2026</span>

# FormAssist

<p class="fa-hero__sub" markdown>
Eine **KI-Sidebar für Chrome**, die Online-Formulare versteht, in einfacher Sprache
erklärt und mit einem Agenten ausfüllt — datensparsam, lokal, und nie ohne dein Okay.
</p>

<div class="fa-hero__cta" markdown>
[:material-rocket-launch: Loslegen](nutzer.md){ .md-button .md-button--primary }
[:fontawesome-brands-github: Quellcode](https://github.com/ujjwalmak/form-ai-assistant){ .md-button }
</div>

</div>

<div class="fa-stats" markdown>
<div class="fa-stat"><b>69</b><span>Unit-Tests</span></div>
<div class="fa-stat"><b>~77 %</b><span>Branch-Coverage</span></div>
<div class="fa-stat"><b>15</b><span>Profilfelder</span></div>
<div class="fa-stat"><b>0</b><span>Auto-Submits</span></div>
</div>

[![Tests](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml)
[![Projektwebseite deployen](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-8b5cf6?style=flat-square)
![MkDocs Material](https://img.shields.io/badge/docs-MkDocs%20Material-d946ef?style=flat-square)

!!! abstract "Fallstudie"
    KI-Assistent zur korrekten Eingabe von Daten in komplexe Browser-Formulare.
    Studienprojekt im Modul *AI-Prototyping* (SS 2026, Prof. Dr. Sebastian Dünnebeil, FK07).

    **Team:** Maximilian Plitzko · Ujjwal Makkar

## Welches Problem es löst

Behörden-, Anmelde- und Versicherungsformulare sind oft lang, missverständlich beschriftet
und fehleranfällig. FormAssist senkt diese Hürde: Es liest die Felder **semantisch** aus
(nicht nur als HTML-Scanner), erklärt Zweck und Pflichtangaben und überträgt die richtigen
Werte aus einem gespeicherten Profil — mit Rückfragen, wo etwas unklar ist.

## Der Mehrwert auf einen Blick

<div class="grid cards" markdown>

-   :material-brain:{ .lg .middle } __Versteht Formulare statt nur Felder__

    ---

    Label-Hierarchie, Hinweise und Fehlermeldungen fließen in den KI-Kontext ein —
    nicht bloß ein roher HTML-Scan.

-   :material-cursor-default-click:{ .lg .middle } __Füllt autonom oder mit Vorschau__

    ---

    Zwei Modi: direktes Feld-für-Feld-Ausfüllen oder eine editierbare Vorschau
    vor jeder Ausführung.

-   :material-shield-lock:{ .lg .middle } __Sendet nie automatisch ab__

    ---

    Das Absenden bleibt immer beim Nutzer — eine fest verdrahtete Guardrail
    im Action-Parser.

-   :material-page-next:{ .lg .middle } __Mehrseitige Formulare__

    ---

    Der Agent navigiert eigenständig und setzt nach Seitenwechseln fort —
    bis zu einer Sicherheitsgrenze.

-   :material-database-lock:{ .lg .middle } __Lokal & datensparsam__

    ---

    Profile liegen lokal im Browser; nur für KI-Funktionen werden relevante
    Daten an den gewählten Provider übertragen.

-   :material-calendar-clock:{ .lg .middle } __Datums-Intelligenz__

    ---

    Versteht „nächster Monat", „in 2 Wochen" (DE + EN) und normalisiert
    Formate ins jeweilige Feldformat.

</div>

## Für wen diese Doku gedacht ist

<div class="grid cards" markdown>

-   :material-account:{ .lg .middle } __Nutzer__

    ---

    Was kann ich, wie nutze ich es, wie sicher ist es?

    [:octicons-arrow-right-24: Für Nutzer](nutzer.md)

-   :material-code-tags:{ .lg .middle } __Entwickler__

    ---

    Wie ist FormAssist gebaut und getestet?

    [:octicons-arrow-right-24: Architektur](architektur.md) ·
    [Entwicklung](entwicklung.md)

-   :material-clipboard-check:{ .lg .middle } __Bewertung & Kontext__

    ---

    Stand, Entscheidungen und ehrliche Reflexion.

    [:octicons-arrow-right-24: Projektstand](projektstand.md)

</div>

!!! note "Quelle der Inhalte"
    Diese Webseite ist aus dem Repository abgeleitet (README, Projektstand, Tests, Code,
    `doc-agent/`). Es werden bewusst nur Aussagen getroffen, die sich am Code belegen lassen.
