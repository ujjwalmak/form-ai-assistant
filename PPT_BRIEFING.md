# FormAssist – Vollständiges Briefing für eine Zwischenpräsentation

## KONTEXT & AUFTRAG

Erstelle eine **professionelle, modern designte PowerPoint-Präsentation** (10 Folien, 16:9) für die Zwischenpräsentation eines studentischen Projekts an der Hochschule München, Kurs „AI-Prototyping", Datum: 21.05.2026.

Ziel der Präsentation:
- Funktionsumfang vorstellen
- Vorgehensweise erklären
- Probleme & Limitationen teilen
- Feedback einholen

**Design-Anforderungen:**
- Dunkles Theme (Deep Navy / Dark Slate + Electric Cyan oder Violet Akzente)
- Sehr modern, tech-startup feel — ähnlich wie Vercel, Linear, Raycast Marketing Pages
- Große Icons/Emojis als visuelle Anker
- Maximal 5 Bulletpoints pro Folie, großzügige Whitespace
- Konsistente Farbsprache: Grün = Done, Orange = In Progress, Violett = Geplant
- Keine Clipart, keine Standard-Office-Themes

---

## 1. PROJEKTÜBERSICHT

**Name:** FormAssist – KI-Assistent für Browser-Formulare  
**Typ:** Chrome Extension (Manifest V3)  
**Version:** 1.1  
**Team:** Studentenprojekt, Hochschule München  
**Codebasis:** ~4.100 Zeilen JavaScript, aufgeteilt in 8 Dateien  

**One-Liner:** FormAssist ist eine Chrome Extension, die per KI-Agent jedes Online-Formular automatisch analysiert und ausfüllt — ohne Backend, ohne Datenweitergabe, kostenlos.

---

## 2. PROBLEMSTELLUNG (Folie 2)

Online-Formulare sind:
- **Repetitiv** — dieselben Daten (Name, Adresse, IBAN) werden täglich neu eingetippt
- **Fehleranfällig** — Tippfehler, falsches Format, fehlende Pflichtfelder führen zu Ablehnungen
- **Kein Standard** — jede Webseite hat andere Felder, Labels, Validierungsregeln
- **Komplex bei Behörden** — Feldbezeichnungen wie „Meldeanschrift lt. Ausweis" sind unklar
- **Zeitaufwendig** — mehrseitige Formulare (z.B. service.berlin.de) dauern 20–40 Minuten

**Zielgruppe:** Jede Person, die regelmäßig Online-Formulare ausfüllt — Behörden, Banken, E-Commerce.

---

## 3. DIE LÖSUNG — WAS IST FORMASSIST? (Folie 3)

### Kernprinzip
1. Nutzer legt einmal ein **Profil** an (Name, Adresse, Kontakt, Bank, Beruf)
2. Auf jeder Webseite mit Formular öffnet er die **Sidebar** (Alt+Shift+F)
3. Der **KI-Agent** analysiert alle Felder, matcht sie mit dem Profil und füllt sie aus
4. Unbekannte Felder fragt er gezielt nach — die Antworten merkt er sich für die Session

### Architektur (8 Dateien, kein Backend)

| Datei | Funktion |
|---|---|
| `content.js` (2.953 Zeilen) | Haupt-Runtime: Shadow-DOM-UI, Agent, Guided Mode, Profil, Submit-Review, History |
| `background.js` (204 Zeilen) | LLM-Transport via Service Worker — Groq + OpenRouter, Streaming + Non-Streaming |
| `fa-scanner.js` (407 Zeilen) | Formularerkennung: Shadow DOM, Web Components, iFrames, Nav-Filter |
| `fa-fill.js` (105 Zeilen) | Feldbefüllung: Input, Select, Checkbox, Radio, Datepicker (Flatpickr, jQuery UI etc.) |
| `fa-profile.js` (27 Zeilen) | Profil-State-Management |
| `fa-styles.js` | Komplettes CSS-in-JS für die Shadow-DOM-Sidebar |
| `fa-supabase.js` (141 Zeilen) | Optionale Cloud-Synchronisation (Profil + History) |
| `fa-utils.js` (95 Zeilen) | Shared Utilities |
| `options.html/js` (196 Zeilen) | Einstellungsseite: Provider, API-Keys, Modell |

### Tech-Stack
- **Chrome Extension Manifest V3** — läuft auf jeder Website
- **Shadow DOM** (`attachShadow({ mode: 'open' })`) — zero CSS-Konflikte mit Host-Seiten
- **Groq API** — Llama 3.3 70b (Standard, sehr schnell, kostenlos)
- **OpenRouter** — Auto-Fallback bei Rate-Limit oder Server-Fehler (meta-llama/llama-3.3-70b-instruct:free)
- **Supabase** — optionale Cloud-Synchronisation (Profil, History, Formular-Tipps)
- **Kein Backend, kein Server** — alle Daten lokal in `chrome.storage.local`

---

## 4. FUNKTIONSUMFANG DETAIL (Folie 4 + Demo-Folie)

### KI-Agent (Kernfunktion)
- Scannt alle Formularfelder der aktuellen Seite (inkl. Shadow DOM, Web Components)
- **Deterministic Profile Fill zuerst**: starke Profil-Matches werden ohne API-Call direkt gefüllt
- Nur für wirklich unbekannte Felder → KI-Call mit fokussiertem Einzelprompt
- Session-Answers: Nutzerantworten werden gespeichert und auf Folgeseiten wiederverwendet
- **Mehrseitige Formulare**: Agent navigiert selbständig (Weiter-Button, Submit)
- Wartet bis zu 4 Sekunden auf dynamisch geladene Felder (`waitForFields()`)
- Automatische Korrektur-Runde bei Validierungsfehlern

### Formularhilfe
- **„Formular erklären"**: KI fasst Zweck, Pflichtfelder, Stolperstellen zusammen
- **Submit-Review**: Vor dem Absenden prüft KI alle Felder (Status: ✅ OK / ⚠️ Warnung / ❌ Fehlt)
- **Proaktive Fehlerhilfe**: Erkennt invalide Felder automatisch, zeigt Korrekturhinweis

### Profil & Datenverwaltung
- **15 Standardfelder**: Vorname, Nachname, Geburtsdatum, E-Mail, Telefon, Straße, PLZ, Stadt, Land, IBAN, BIC, Beruf, Arbeitgeber, Führerschein, Nationalität
- **Extras**: Gelernte Freitextfelder (z.B. Matrikelnummer, Steuernummer) — im Profil bearbeitbar
- **Mehrere Profile** — Switcher, Anlegen, Löschen (z.B. Profil „Privat" vs. „Uni")
- **Import / Export** als JSON

### Formularerkennung (technisch)
- Erkennt Felder in Shadow DOM und Web Components
- Nav-Filter: ignoriert Felder in `nav`, `header`, `footer`, `[role=search]`
- Datepicker-Support: Flatpickr, Pikaday, jQuery UI Datepicker, Bootstrap DateTimePicker
- Radio-Button-Fix: nutzt `click()` statt `checked = true` für React/Vue-Kompatibilität

### UI/UX
- Rechts angedockte Sidebar, per Drag lösbar + frei positionierbar
- Resize an allen Seiten und Ecken
- **Dark Mode** Toggle im Header
- Toast-Benachrichtigungen (z.B. bei Auto-Fallback auf OpenRouter)
- **Keyboard Shortcuts**: `Alt+Shift+F` (öffnen/schließen), `Alt+Shift+S` (Agent starten)
- Verlaufspanel: letzte 30 Sessions (Domain, Titel, Feldanzahl, Datum)

### LLM-Infrastruktur
- Zwei Provider parallel konfigurierbar
- **Auto-Fallback**: Groq 429/5xx → OpenRouter automatisch, Nutzer sieht Toast
- Streaming (`llm-stream` Port) + Non-Streaming (`llm-fetch` Message) via Service Worker
- Alle Requests über `background.js` (CSP-sicher)

### Cloud-Sync (Optional)
- Supabase Integration: Profil + History von überall abrufbar
- Tabellen: `fa_profiles`, `fa_history`, `form_fields`
- Row Level Security aktiv (device_id basiert)
- Formular-Feld-Tipps: kuratierte Hinweise pro Domain + Feld (mehrsprachig: DE/EN/FR/ES/TR)

---

## 5. PROJEKTSTAND (Folie 6)

### ✅ Fertig
- KI-Agent (Auto-Fill, mehrseitig, deterministic profile fill)
- Groq + OpenRouter mit Auto-Fallback
- Profil-System (15 Felder, Extras, Multi-Profil, Import/Export)
- Submit-Review vor Abgabe
- History (30 Sessions)
- Shadow DOM — kein CSS-Clash mit Host-Seiten
- Dark Mode + Keyboard Shortcuts
- Supabase Sync (optional, Profil + History)
- Streaming + Non-Streaming LLM-Support
- Modularisierung in 8 Dateien (war vorher 1 Datei, 3.000+ Zeilen)
- Automatische Fallback-Logik mit User-Feedback (Toast)

### 🔄 In Progress
- Komplexe Formulare (verschachtelte Dropdowns, dynamische Felder)
- Prompt-Optimierung (Genauigkeit bei mehrdeutigen Feldern erhöhen)
- Edge Cases: iFrames, Custom Web Components, reaktive Frameworks
- Formular-Feld-Tipps aus Supabase (Daten vorhanden, Integration steht aus)

### 📋 Geplant (Next Steps)
- Backend-Proxy (API-Keys serverseitig, kein Key im Browser)
- Supabase Auth / OAuth (Google Login statt device_id)
- Consent-Mechanik vor KI-Datenübertragung (DSGVO)
- Chrome Web Store Veröffentlichung (MV3-konform, Icons vorhanden)
- Vision OCR: Ausweis-Foto → KI liest Daten direkt ins Profil
- Sprachsteuerung (Web Speech API)
- Live-Validierung während des Tippens

---

## 6. VORGEHENSWEISE — VIBE CODING (Folie 7)

**Methode:** "Vibe Coding" — iterative KI-gestützte Entwicklung ohne klassisches Lastenheft

**Flow:**
1. **Idee** — Feature-Wunsch formulieren
2. **Prompt** — KI-Prompt schreiben (Claude / GPT)
3. **Code** — KI generiert Implementierung
4. **Testen** — Manuell auf echten Formularen testen
5. **Korrigieren** — Bugs fixen, KI nachkorrigieren

**Besonderheiten:**
- Auch Bugfixing, Refactoring und Code-Cleanup wurden per Prompt gesteuert
- Große Modularisierung (8 Dateien) entstand aus dem Problem heraus, dass zu viel Code in einer Datei die KI-Outputs verschlechtert hat
- Projekt wuchs organisch — keine Roadmap, kein Ticket-System
- KI als Co-Pilot: KI gibt Code vor, Mensch testet, entscheidet, gibt Richtung

---

## 7. PROBLEME & LIMITATIONEN (Folie 8)

### 1. Token-Limits / Kontext-Overflow
**Problem:** Große Formulare (50+ Felder) + große Codebasis → Kontext-Limit des LLMs wird erreicht, Outputs werden unvollständig oder falsch.  
**Lösung:** Felder werden einzeln statt als Batch gesendet; Codebasis wurde in 8 Module aufgeteilt.

### 2. LLM-Konflikte bei mehreren Tabs
**Problem:** Mehrere Tabs gleichzeitig → gleichzeitige API-Calls → Rate-Limits (429), kein Request-Queuing.  
**Lösung:** Auto-Fallback auf OpenRouter bei 429; langfristig: Backend-Proxy mit Queue.

### 3. Keine automatische Dokumentation
**Problem:** KI hat keine Session-Erinnerung → nach jeder Session muss der Kontext neu aufgebaut werden. KI weigert sich automatisch Dokumentation zu führen.  
**Lösung:** Manuelle Pflege von README.md, NEXT_STEPS.md, CLAUDE.md als persistenter Kontext.

### 4. Komplexität verschlechtert KI-Output
**Problem:** Je größer der Code, desto mehr Abhängigkeiten — KI übersieht sie und erzeugt unerwartete Bugs. Content.js war zwischenzeitlich 3.000+ Zeilen.  
**Lösung:** Strikte Modularisierung; klare Modul-Grenzen verhindern Cross-Dependencies.

### 5. Anforderungsmanagement unterschätzt
**Problem:** Kein klares Ziel → Feature-Creep, schwer zu wissen wann "fertig". Oft unklar, in welche Richtung es gehen soll.  
**Lösung:** NEXT_STEPS.md priorisiert nächste Schritte; klare Abgrenzung Was/Warum/Wie pro Feature.

---

## 8. AUSBLICK — NEXT STEPS (Folie 9)

### Vision OCR (kurzfristig)
Foto von Personalausweis/Pass hochladen → Groq Llama-4 Vision liest Daten direkt ins Profil  
Model: `meta-llama/llama-4-scout-17b-16e-instruct` (kostenlos, Vision-fähig)  
Cost: < $0.001 pro Scan

### Supabase Auth (mittelfristig)
Echter User-Account statt gerätespezifischer UUID → Profil von überall abrufbar  
Google OAuth oder Magic Link via E-Mail  
RLS: `auth.uid() = user_id` statt `device_id`

### Formular-Feld-Tipps Datenbank (kurzfristig)
Beim Fokussieren eines Felds: kuratierter Tipp aus Supabase  
z.B. "Dieses Feld erwartet Ihre Meldeadresse, keine Postfach-Adresse"  
Daten bereits vorhanden für service.berlin.de und roboform.com (DE/EN/FR/TR)

### Live-Validierung während des Tippens (mittelfristig)
Debounced Input-Listener → schneller KI-Call → Inline-Warnung  
z.B. "Diese PLZ existiert nicht in Bayern", "IBAN-Prüfziffer ungültig"

### Sprachsteuerung (experimentell)
Mikrofon-Button → Web Speech API → KI mappt Transkript auf Felder  
"Meine Adresse ist Musterstraße 42 in Berlin" → füllt Straße, Hausnummer, PLZ, Stadt

### Production Packaging
Backend-Proxy für API-Keys (Supabase Edge Functions)  
Chrome Web Store Veröffentlichung (MV3-konform, Icons vorhanden)  
Firefox-Port (geringe Aufwand, nur Web Extensions APIs genutzt)

---

## 9. TECHNISCHE KENNZAHLEN (für Slide-Infografik)

- **4.128** Zeilen JavaScript gesamt
- **8** JavaScript-Module
- **2** LLM-Provider (Groq + OpenRouter)
- **15** Profil-Standardfelder
- **30** gespeicherte History-Einträge
- **3** Supabase-Tabellen (Profil, History, Formular-Tipps)
- **0** Euro Serverkosten (alles kostenlose Free Tiers)
- **0** Backend-Server (alles lokal + direkte API-Calls)
- **~3 Wochen** Entwicklungszeit (Vibe Coding)

---

## 10. EMPFOHLENE FOLIENSTUKTUR

1. **Titelfolie** — FormAssist · KI-Assistent für Browser-Formulare · HM · 21.05.2026
2. **Problemstellung** — 4 Pain-Point-Cards mit Icons
3. **Die Lösung** — Was ist FormAssist? Architektur, Tech-Stack
4. **Funktionsumfang** — 4 Feature-Cards (Agent, Profil, Review, UI)
5. **Demo-Folie** — 5-Schritt Ablauf + Screenshot-Platzhalter
6. **Projektstand** — 3 Spalten: ✅ Fertig / 🔄 In Progress / 📋 Geplant
7. **Vorgehensweise** — Vibe-Coding-Zyklus als visuelle Abfolge
8. **Probleme & Limitationen** — 5 Problem-Cards mit Lösung darunter
9. **Ausblick** — 6 Next-Steps-Cards
10. **Fazit & Fragen** — 3 Takeaways + Fragen-Folie

---

## 11. DESIGN-INSPIRATION & ANWEISUNGEN

Für den Präsentationsersteller:

**Farbpalette:**
- Background: `#0D1B2A` (Deep Navy) oder `#0F172A` (Slate 900)
- Cards: `#1E293B` (Slate 800)
- Primär-Akzent: `#00C2FF` (Electric Cyan) oder `#6366F1` (Indigo)
- Done: `#10B981` (Emerald)
- In Progress: `#F59E0B` (Amber)
- Geplant: `#8B5CF6` (Violet)
- Text: `#F8FAFC` (weiß) / `#94A3B8` (grau für Sekundärtext)

**Fonts:** Inter, Geist, oder Satoshi — modern, tech-fokussiert

**Stil-Referenzen:** Vercel Dashboard, Linear App, Raycast Website — clean, dark, data-dense

**Elemente:**
- Abgerundete Cards mit subtiler Border (`border: 1px solid rgba(255,255,255,0.08)`)
- Farbige Top-Border auf Cards zur Kategorisierung
- Große Emojis/Icons als visuelle Anker (48–64px)
- Zahlen groß hervorheben (z.B. "4.128 Zeilen" als Hero-Zahl)
- Gradient-Akzente sparsam einsetzen

**Präsentationstools die gut funktionieren:**
- Gamma.app (KI-generiert, modernes Design)
- Beautiful.ai
- Canva (dunkles Tech-Template)
- Figma (Slides Plugin)
- Pitch.com
