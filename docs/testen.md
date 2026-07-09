---
title: Selbst testen
---

# FormAssist selbst testen

FormAssist ist eine Chrome-Extension und (noch) nicht im Chrome Web Store. Zum Testen wird sie
als **„entpackte Erweiterung"** geladen — das dauert etwa **2 Minuten** und funktioniert in
Chrome, Edge und Brave.

[:material-download: Extension herunterladen (ZIP, ~90 KB)](download/formassist-v2.1.zip){ .md-button .md-button--primary }
[:material-form-select: Test-Formulare öffnen](https://test-site-gray-zeta.vercel.app){ .md-button }

---

## 1 · Extension installieren

1. **ZIP herunterladen** (Button oben) und **entpacken** — es entsteht ein Ordner `formassist`.
2. In Chrome die Adresse `chrome://extensions` öffnen
   (Edge: `edge://extensions`, Brave: `brave://extensions`).
3. Oben rechts den **Entwicklermodus** aktivieren.
4. Auf **„Entpackte Erweiterung laden"** klicken und den entpackten Ordner `formassist` auswählen.
5. Fertig — das FormAssist-Icon erscheint in der Toolbar.

!!! warning "Wichtig beim Entpacken"
    Den **entpackten Ordner** auswählen, nicht die ZIP-Datei. Auf dem Mac entpackt ein
    Doppelklick die ZIP automatisch; unter Windows: Rechtsklick → „Alle extrahieren…".

## 2 · Kostenlosen API-Key hinterlegen

FormAssist nutzt ein LLM über die Groq-API. Jede:r Tester:in braucht einen eigenen Key —
**kostenlos, ohne Kreditkarte**:

1. Auf [console.groq.com](https://console.groq.com) mit Google/GitHub anmelden.
2. Unter **API Keys → Create API Key** einen Key erstellen und kopieren.
3. Rechtsklick auf das FormAssist-Icon → **Optionen** → Key einfügen → speichern.

!!! tip "Alternative: OpenRouter"
    In den Optionen kann statt Groq auch [OpenRouter](https://openrouter.ai/keys) als Provider
    gewählt werden (ebenfalls mit kostenlosen Modellen).

## 3 · Ausprobieren

Auf der [Test-Seite](https://test-site-gray-zeta.vercel.app) liegen mehrere Beispiel-Formulare
(Bestellung, Bewerbung, Versicherung, Anmeldung …). Dort:

- ++alt+shift+f++ (Mac: ++cmd+shift+f++) — **Sidebar öffnen**: Formular scannen, Felder in
  einfacher Sprache erklären lassen, per Chat nachfragen.
- ++alt+shift+s++ (Mac: ++cmd+shift+s++) — **Smart Fill**: Der Agent füllt das Formular
  autonom mit dem hinterlegten Profil aus.
- Im Optionen-Tab ein **Profil** anlegen (Name, Adresse …) — damit hat der Agent Daten zum
  Ausfüllen. Es funktionieren auch erfundene Daten.

!!! note "Sicherheits-Guardrail"
    FormAssist sendet **niemals selbst ein Formular ab** — das Absenden bleibt immer bei dir.
    Profil­daten liegen lokal im Browser-Storage.

## Probleme?

| Symptom | Lösung |
| --- | --- |
| Icon reagiert nicht | Seite neu laden (Extension wirkt erst nach Reload bereits offener Tabs) |
| „Kein API-Key" | Key in den Optionen speichern, Seite neu laden |
| Shortcut belegt | `chrome://extensions/shortcuts` → Tastenkürzel anpassen |
| Anderer Browser | Firefox/Safari werden nicht unterstützt — bitte Chrome, Edge oder Brave |
