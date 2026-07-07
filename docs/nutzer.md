---
title: Produkt
hide:
  - navigation
---

<div class="fa-page-hero" markdown>
<span class="fa-kicker">Produkt · Für Nutzer</span>

# Dein Ko-Pilot für jedes Online-Formular

<p class="fa-lede" markdown>
FormAssist sitzt als Sidebar neben dem Formular: erklärt Felder in einfacher Sprache,
füllt sie aus deinem Profil und prüft alles auf Fehler — abgesendet wird ausschließlich
von **dir**.
</p>

<div class="fa-chips" markdown>
<span>Chrome-Sidebar</span>
<span>Kein Konto nötig</span>
<span>Profil bleibt lokal</span>
<span>Nie Auto-Submit</span>
</div>
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Fähigkeiten</span>

## Was FormAssist kann
</div>

<div class="grid cards" markdown>

-   :material-lightning-bolt:{ .lg .middle } __⚡ Agent ausfüllen__

    ---

    Analysiert die Formularfelder und füllt sie automatisch aus deinem Profil —
    Feld für Feld, nachvollziehbar.

-   :material-chat-processing:{ .lg .middle } __Agentischer Chat__

    ---

    Die KI setzt Felder direkt aus dem Chat heraus („Trag bei E-Mail x@y.de ein") —
    und sendet dabei **niemals** ab.

-   :material-comment-question:{ .lg .middle } __Formular erklären__

    ---

    Zweck, Pflichtfelder und typische Stolperstellen in Kurzform — in einfacher Sprache.

-   :material-check-decagram:{ .lg .middle } __Live-Validierung__

    ---

    Prüft IBAN, BIC, E-Mail, PLZ, Telefon und Geburtsdatum deterministisch beim Tippen;
    unvollständige Eingaben werden erst beim Verlassen des Felds streng bewertet.

-   :material-clipboard-search:{ .lg .middle } __Submit-Review__

    ---

    Vor dem Absenden prüft die KI auf Fehlendes/Auffälliges und logische Widersprüche
    zwischen Feldern (Status `OK` / `Warnung` / `Fehlt`) — abgesendet wird nur auf
    deine Entscheidung.

-   :material-calendar-clock:{ .lg .middle } __Datums-Intelligenz__

    ---

    Versteht relative Angaben („nächster Monat", „in 2 Wochen", DE + EN) und Formate
    wie `20.02.2000` — und normalisiert sie ins Feldformat.

-   :material-account-switch:{ .lg .middle } __Mehrere Profile__

    ---

    Privat/geschäftlich mit Switcher, Import/Export als JSON.

-   :material-file-eye:{ .lg .middle } __Dokument-Scan__

    ---

    Foto eines Ausweises, einer Visitenkarte oder Rechnung hochladen — ein Vision-Modell
    extrahiert mögliche Profilwerte, die du vor dem Speichern prüfst.

-   :material-brain:{ .lg .middle } __Chat-Gedächtnis pro Domain__

    ---

    Der Agent erinnert sich über Seitenwechsel hinweg — pro Webseite getrennt.

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Ablauf</span>

## Ein typischer Einsatz
</div>

<div class="fa-panel" markdown>
Du öffnest ein längeres Online-Formular (z. B. eine Behörden- oder Anmeldemaske), startest
FormAssist über die Sidebar und drückst **⚡ Agent**. Die Felder werden aus deinem Profil
gefüllt; bei wirklich unbekannten Angaben fragt der Agent gezielt nach. Mehrseitige
Formulare arbeitet er bis zu einer Sicherheitsgrenze selbstständig durch — den letzten
Klick auf „Absenden" machst du.
</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Setup</span>

## In zwei Minuten startklar
</div>

<div class="fa-steps">
  <div class="fa-step">
    <strong>Laden</strong>
    <p><code>chrome://extensions</code> öffnen → Entwicklermodus aktivieren →
    <b>„Entpackte Erweiterung laden"</b> → Projektordner auswählen. Kein Build-Step nötig.</p>
  </div>
  <div class="fa-step">
    <strong>Key eintragen</strong>
    <p>In den FormAssist-Einstellungen einen Provider wählen:
    <b>Groq</b> (<a href="https://console.groq.com">console.groq.com</a>, <code>gsk_…</code>)
    oder <b>OpenRouter</b> (<a href="https://openrouter.ai/keys">openrouter.ai/keys</a>,
    <code>sk-or-v1-…</code>, optional als Backup).</p>
  </div>
  <div class="fa-step">
    <strong>Loslegen</strong>
    <p>Auf einer Seite mit Formular die Sidebar öffnen und den Agent starten —
    per Klick oder Shortcut.</p>
  </div>
</div>

| Aktion | Shortcut |
|---|---|
| Sidebar öffnen | ++alt+shift+f++ |
| Agent starten | ++alt+shift+s++ |

<div class="fa-section-head" markdown>
<span class="fa-kicker">Sicherheit</span>

## Wie sicher ist das?
</div>

<div class="fa-trust" markdown>

<div class="fa-trust__item" markdown>
:material-key-variant:

**API-Keys nie im Code**

Keys liegen in `chrome.storage.sync` — nicht im Code, nicht im Repository.
</div>

<div class="fa-trust__item" markdown>
:material-filter-check:

**Datenminimierung**

Für KI-Funktionen gehen relevante Formular- und Profildaten an den gewählten Provider
(Groq bzw. OpenRouter) — bewusst und auf das Nötige beschränkt.
</div>

<div class="fa-trust__item" markdown>
:material-file-check:

**Dokument-Scan nur mit Okay**

Bilder werden vor dem Senden im Browser auf max. 1400 px verkleinert; der Upload startet
erst nach expliziter Bestätigung. Erkannte Werte werden nur vorbefüllt und erst durch
**Speichern** übernommen.
</div>

<div class="fa-trust__item" markdown>
:material-send-lock:

**Kein Auto-Submit**

Der Agent darf Formulare nie selbst absenden — eine fest verdrahtete Guardrail
im Action-Parser.
</div>

<div class="fa-trust__item" markdown>
:material-select-off:

**Isolierte UI**

Die gesamte Oberfläche läuft in einem Shadow DOM, ohne in die Host-Seite einzugreifen.
</div>

</div>

<div class="fa-section-head" markdown>
<span class="fa-kicker">Transparenz</span>

## Grenzen — ehrlich benannt
</div>

<div class="fa-limits" markdown>

<div class="fa-limit" markdown>
**Nativer Chrome-PDF-Viewer**

Dort laufen keine Content-Scripts — FormAssist funktioniert in PDF-Ansichten nicht.
</div>

<div class="fa-limit" markdown>
**Fremde (cross-origin) iFrames**

Deren Felder sind aus Sicherheitsgründen nicht auslesbar.
</div>

<div class="fa-limit" markdown>
**Client-seitiger API-Key**

Für lokalen/prototypischen Einsatz gedacht; ein produktiver Rollout bräuchte einen
Backend-Proxy und einen expliziten Consent-Flow pro Formular.
</div>

<div class="fa-limit" markdown>
**Closed Shadow Roots**

Komplett geschlossene Web-Components bleiben technisch unzugänglich; offene und
verschachtelte Shadow Roots werden unterstützt.
</div>

</div>

!!! info "Status"
    FormAssist ist ein funktionsfähiger Prototyp für den lokalen Einsatz, kein
    Produktivprodukt. Siehe [Projektstand & Reflexion](projektstand.md).
