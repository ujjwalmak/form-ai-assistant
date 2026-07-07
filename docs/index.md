---
title: Übersicht
hide:
  - navigation
  - toc
---

<div class="fa-hero" markdown>

![FormAssist](img/logo.svg){ .fa-hero__logo }

<span class="fa-hero__badge">Studienprojekt · AI-Prototyping SS 2026</span>

# Formulare. Verstanden. Ausgefüllt.

<p class="fa-hero__sub" markdown>
**FormAssist** ist eine KI-Sidebar für Chrome, die Online-Formulare versteht, in einfacher
Sprache erklärt und mit einem Agenten ausfüllt — datensparsam, lokal, und nie ohne dein Okay.
</p>

<div class="fa-hero__cta" markdown>
[:material-rocket-launch: Loslegen](nutzer.md){ .md-button .md-button--primary }
[:fontawesome-brands-github: Quellcode](https://github.com/ujjwalmak/form-ai-assistant){ .md-button }
</div>

<div class="fa-mock" aria-hidden="true">
<div class="fa-mock__bar">
<span class="fa-mock__dot"></span><span class="fa-mock__dot"></span><span class="fa-mock__dot"></span>
<div class="fa-mock__url">anmeldung.stadt-beispiel.de/wohnsitz</div>
</div>
<div class="fa-mock__body">
<div class="fa-mock__form">
<div class="fa-mock__field"><label>Vorname *</label><div class="fa-mock__input is-filled">Maximilian</div></div>
<div class="fa-mock__field"><label>Nachname *</label><div class="fa-mock__input is-filled">Mustermann</div></div>
<div class="fa-mock__field"><label>IBAN *</label><div class="fa-mock__input is-typing">DE89 3704 0044 05<span class="fa-mock__caret"></span></div></div>
<div class="fa-mock__field"><label>Einzugsdatum</label><div class="fa-mock__input"></div></div>
<div class="fa-mock__submit">Absenden</div>
</div>
<div class="fa-mock__side">
<div class="fa-mock__sidehead">FormAssist <span class="fa-mock__pulse"></span></div>
<div class="fa-mock__msg">Formular erkannt — <b>12 Felder</b>, davon 5 Pflichtangaben.</div>
<div class="fa-mock__msg"><b>IBAN</b> ist deine internationale Kontonummer. Du findest sie auf deiner Bankkarte oder im Online-Banking.</div>
<div class="fa-mock__msg fa-mock__msg--user">Füll alles aus meinem Profil aus.</div>
<div class="fa-mock__status"><span></span></div>
<div class="fa-mock__statustext">Fülle Feld 7 von 12 … Abgesendet wird nur von dir.</div>
</div>
</div>
</div>

</div>

<div class="fa-ticker" aria-hidden="true">
<div class="fa-ticker__track">
<span>Semantischer Formular-Scan</span><span>Agent- &amp; Vorschau-Modus</span><span>Submit-Guardrail</span><span>Vision-OCR für Dokumente</span><span>Datums-Parser DE + EN</span><span>Live-Validierung IBAN · BIC · PLZ</span><span>Shadow-DOM-UI</span><span>Mehrseitige Formulare</span><span>Groq + OpenRouter</span><span>133 Unit-Tests</span>
<span>Semantischer Formular-Scan</span><span>Agent- &amp; Vorschau-Modus</span><span>Submit-Guardrail</span><span>Vision-OCR für Dokumente</span><span>Datums-Parser DE + EN</span><span>Live-Validierung IBAN · BIC · PLZ</span><span>Shadow-DOM-UI</span><span>Mehrseitige Formulare</span><span>Groq + OpenRouter</span><span>133 Unit-Tests</span>
</div>
</div>

<div class="fa-stats" markdown>
<div class="fa-stat"><b>133</b><span>Unit-Tests</span></div>
<div class="fa-stat"><b>~77 %</b><span>Branch-Coverage</span></div>
<div class="fa-stat"><b>15</b><span>Profilfelder</span></div>
<div class="fa-stat"><b>0</b><span>Auto-Submits</span></div>
</div>

<div class="fa-badges" markdown>
[![Tests](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/test.yml)
[![Projektwebseite deployen](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml/badge.svg)](https://github.com/ujjwalmak/form-ai-assistant/actions/workflows/docs.yml)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-8b5cf6?style=flat-square)
![MkDocs Material](https://img.shields.io/badge/docs-MkDocs%20Material-d946ef?style=flat-square)
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Ablauf</span>

## So funktioniert's

Behörden-, Anmelde- und Versicherungsformulare sind lang, missverständlich beschriftet und
fehleranfällig. FormAssist senkt diese Hürde — in drei Schritten.
</div>

<div class="fa-steps">
  <div class="fa-step">
    <strong>Scannen</strong>
    <p>FormAssist liest das Formular semantisch aus: Label-Hierarchie, Hinweise, Pflichtfelder und Fehlermeldungen — nicht bloß ein roher HTML-Scan.</p>
  </div>
  <div class="fa-step">
    <strong>Verstehen</strong>
    <p>Die KI erklärt Zweck und Pflichtangaben jedes Feldes in einfacher Sprache — und fragt nach, wo etwas unklar ist.</p>
  </div>
  <div class="fa-step">
    <strong>Ausfüllen</strong>
    <p>Der Agent überträgt die richtigen Werte aus deinem Profil — Feld für Feld oder mit editierbarer Vorschau, mit Live-Validierung vor dem Absenden.</p>
  </div>
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Features</span>

## Der Mehrwert auf einen Blick
</div>

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

    Profile liegen lokal im Browser; Dokument-Scans brauchen eine explizite
    Bestätigung und werden clientseitig verkleinert.

-   :material-calendar-clock:{ .lg .middle } __Datums-Intelligenz__

    ---

    Versteht „nächster Monat", „in 2 Wochen" (DE + EN) und normalisiert
    Formate ins jeweilige Feldformat.

-   :material-check-decagram:{ .lg .middle } __Prüft vor dem Absenden__

    ---

    Live-Validierung für IBAN, BIC, E-Mail, PLZ, Telefon und Geburtsdatum
    plus Logik-Check im Submit-Review.

-   :material-file-eye:{ .lg .middle } __Liest Dokumente ins Profil__

    ---

    Fotos von Ausweis, Visitenkarte oder Rechnung können per Vision-OCR
    Profilfelder vorbefüllen — gespeichert wird erst nach Review.

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Vertrauen</span>

## Sicherheit ist Architektur, kein Feature
</div>

<div class="fa-trust" markdown>

<div class="fa-trust__item" markdown>
:material-send-lock:

**Kein Auto-Submit — jemals**

Das Absenden ist im Action-Parser hart blockiert. Egal was das LLM vorschlägt:
Der letzte Klick gehört dir.
</div>

<div class="fa-trust__item" markdown>
:material-database-lock:

**Dein Profil bleibt bei dir**

Profile liegen im Browser (`chrome.storage`). Cloud-Sync via Supabase gibt es nur,
wenn du ihn selbst in den Optionen aktivierst.
</div>

<div class="fa-trust__item" markdown>
:material-filter-check:

**Datenminimierung by Design**

An den LLM-Provider (Groq, Fallback OpenRouter) geht nur der relevante
Formularkontext — Netzwerkzugriffe laufen ausschließlich über den Service Worker.
</div>

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Für wen?</span>

## Der richtige Einstieg in diese Doku
</div>

<div class="grid cards" markdown>

-   :material-account:{ .lg .middle } __Nutzer__

    ---

    Was kann ich, wie nutze ich es, wie sicher ist es?

    [:octicons-arrow-right-24: Produkt](nutzer.md)

-   :material-code-tags:{ .lg .middle } __Entwickler__

    ---

    Wie ist FormAssist gebaut und getestet?

    [:octicons-arrow-right-24: Technologie](architektur.md) ·
    [Engineering](entwicklung.md)

-   :material-clipboard-check:{ .lg .middle } __Bewertung & Kontext__

    ---

    Stand, Entscheidungen und ehrliche Reflexion.

    [:octicons-arrow-right-24: Status & Reflexion](projektstand.md)

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">FAQ</span>

## Häufige Fragen
</div>

<details class="fa-faq" markdown>
<summary>Wo liegen meine Daten?</summary>
Dein Profil liegt lokal im Browser (`chrome.storage`). Beim Ausfüllen gehen Formularkontext
und die relevanten Profilwerte an den gewählten LLM-Provider (Groq oder OpenRouter) — das ist
bewusst so und in der [Architektur](architektur.md) dokumentiert. Ein geräteübergreifender
Supabase-Sync ist optional und standardmäßig aus.
</details>

<details class="fa-faq" markdown>
<summary>Kann der Agent das Formular versehentlich absenden?</summary>
Nein. `submit` ist im Action-Parser hart blockiert — eine fest verdrahtete Guardrail,
unabhängig davon, was das Sprachmodell vorschlägt. Absenden tust nur du.
</details>

<details class="fa-faq" markdown>
<summary>Was brauche ich, um FormAssist zu nutzen?</summary>
Chrome und einen API-Key von Groq oder OpenRouter (gespeichert in `chrome.storage.sync`,
niemals im Code). Die Extension wird als „entpackte Erweiterung" geladen — kein Build-Step,
keine Registrierung. Anleitung: [Produkt](nutzer.md).
</details>

<details class="fa-faq" markdown>
<summary>Funktioniert das auch bei mehrseitigen Formularen?</summary>
Ja. Der Agent klickt sich eigenständig durch Folgeseiten und setzt das Ausfüllen dort fort —
bis zu einer Sicherheitsgrenze, damit er nicht endlos navigiert.
</details>

<details class="fa-faq" markdown>
<summary>Ist das ein fertiges Produkt?</summary>
FormAssist ist ein Studienprojekt im Modul *AI-Prototyping* (SS 2026, Prof. Dr. Sebastian
Dünnebeil, FK07) von Maximilian Plitzko und Ujjwal Makkar. Der komplette Quellcode ist
[offen auf GitHub](https://github.com/ujjwalmak/form-ai-assistant) — inklusive ehrlicher
[Reflexion](reference/reflexion.md) darüber, was gut lief und was nicht.
</details>

<div class="fa-cta" markdown>

## Bereit für Formulare ohne Frust?

<p markdown>
In zwei Minuten installiert: Repo klonen, als entpackte Erweiterung laden,
API-Key eintragen — fertig.
</p>

<div class="fa-hero__cta" markdown>
[:material-rocket-launch: Jetzt loslegen](nutzer.md){ .md-button .md-button--primary }
[:fontawesome-brands-github: Code ansehen](https://github.com/ujjwalmak/form-ai-assistant){ .md-button }
</div>

</div>

!!! note "Quelle der Inhalte"
    Diese Webseite ist aus dem Repository abgeleitet (README, Projektstand, Tests, Code,
    `doc-agent/`). Es werden bewusst nur Aussagen getroffen, die sich am Code belegen lassen.
