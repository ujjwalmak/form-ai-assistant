# FormAssist — KI Formular-Assistent

[![Tests](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml)
[![Projektwebseite deployen](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-deep%20purple)
![Built with MkDocs Material](https://img.shields.io/badge/docs-MkDocs%20Material-pink)

FormAssist ist eine **Chrome-Extension (Manifest V3)**, die auf Webseiten mit Formularen
eine KI-Sidebar einblendet. Der Agent analysiert die Felder, erklärt das Formular in
einfacher Sprache und füllt es — gespeist aus einem persönlichen Profil — weitgehend
automatisiert oder im Dialog aus.

!!! abstract "Fallstudie"
    KI-Assistent zur korrekten Eingabe von Daten in komplexe Browser-Formulare.
    Studienprojekt im Modul *AI-Prototyping* (SS 2026, Prof. Dr. Sebastian Dünnebeil, FK07).

    **Team:** Maximilian Plitzko · Ujjwal Makkar

!!! warning "TODO: fachlich klären — Screenshot ergänzen"
    Hier ein Screenshot der FormAssist-Sidebar auf einem Formular einfügen.
    Bild unter `docs/img/` ablegen, dann einbinden mit `![FormAssist-Sidebar](img/hero.png)`.

## Welches Problem es löst

Behörden-, Anmelde- und Versicherungsformulare sind oft lang, missverständlich beschriftet
und fehleranfällig. FormAssist senkt diese Hürde: Es liest die Felder **semantisch** aus
(nicht nur als HTML-Scanner), erklärt Zweck und Pflichtangaben und überträgt die richtigen
Werte aus einem gespeicherten Profil — mit Rückfragen, wo etwas unklar ist.

## Der Mehrwert auf einen Blick

- **Versteht Formulare statt nur Felder** — Label-Hierarchie, Hinweise und Fehlermeldungen
  fließen in den KI-Kontext ein.
- **Füllt autonom oder mit Vorschau** — zwei Modi: direktes Feld-für-Feld-Ausfüllen oder
  eine editierbare Vorschau vor jeder Ausführung.
- **Sendet nie automatisch ab** — das Absenden bleibt immer beim Nutzer (harte Guardrail).
- **Mehrseitige Formulare** — der Agent navigiert eigenständig und setzt nach Seitenwechseln fort.
- **Lokal & datensparsam** — Profile liegen lokal im Browser; nur für KI-Funktionen werden
  relevante Daten an den gewählten Provider übertragen.

## Für wen diese Doku gedacht ist

| Stakeholder | Wo es weitergeht |
|---|---|
| **Nutzer** — was kann ich, wie nutze ich es, wie sicher ist es? | [Für Nutzer](nutzer.md) |
| **Entwickler / technisch Interessierte** — wie ist es gebaut? | [Technische Architektur](architektur.md) · [Entwicklung & Qualität](entwicklung.md) |
| **Bewertung / fachlicher Kontext** — Stand, Entscheidungen, Reflexion | [Projektstand & Reflexion](projektstand.md) |

!!! note "Quelle der Inhalte"
    Diese Webseite ist aus dem Repository abgeleitet (README, Projektstand, Tests, Code,
    `doc-agent/`). Nicht belegbare Aussagen sind bewusst vermieden bzw. als
    `TODO: fachlich klären` markiert.
