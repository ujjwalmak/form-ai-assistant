# Known Issues — FormAssist

---

## Issue: Verwaiste Multifile-Dateien im Repo

**Problem:**
Die alten Multifile-Dateien wurden vom Repo entfernt; das Problem ist erledigt.

**Ursache:**
Merge der beiden Codelinien (Kollege + Claude) hat die aktive Architektur auf Single-File umgestellt, die alten Dateien aber nicht entfernt.

**Lösung:**
Dateien entfernt und README aktualisiert.

**Vermeidung:**
Nach Architektur-Entscheidungen verwaiste Dateien sofort aufräumen.

---

## Issue: README beschreibt falsche Architektur

**Problem:**
`README.md` wurde vom Kollegen überschrieben und beschreibt die Multifile-Architektur (state.js, ui.js etc.), die nicht mehr aktiv ist.

**Ursache:**
Kollege hat README in einem eigenen Commit aktualisiert, bevor der Merge stattfand.

**Lösung:**
README auf aktuelle Single-File-Architektur aktualisieren. Erledigt am 2026-04-30.

**Vermeidung:**
README immer im gleichen Commit wie Architektur-Änderungen aktualisieren.

---

## Issue: GitHub Push Protection blockiert hardcodierte API-Keys

**Problem:**
Groq API-Key (`gsk_…`) wurde direkt in `content.js` hardcodiert. GitHub Push Protection hat den Push blockiert.

**Ursache:**
GitHub scannt automatisch Commits auf bekannte Secret-Formate (Groq, Anthropic, AWS etc.).

**Lösung:**
Key in `api-key.txt` ausgelagert (gitignored), wird via `chrome.runtime.getURL` zur Laufzeit geladen.

**Vermeidung:**
Nie API-Keys direkt in Source-Dateien schreiben. Immer `.gitignore` + Laufzeit-Laden.

---

## Issue: Minimize funktionierte nicht im free (gedraggten) Modus

**Problem:**
CSS-Klasse `.minimized { height: 56px }` wurde durch `sidebar.style.height` (inline, gesetzt beim Drag) überschrieben. Minimize-Button hatte keine sichtbare Wirkung.

**Ursache:**
CSS-Klassen haben niedrigere Spezifität als inline styles. Nach dem ersten Drag hat das Panel eine inline-Höhe.

**Lösung:**
Minimize-Handler setzt `sidebar.style.height = '56px'` direkt in JS. Vorherige Höhe wird in `savedHeight` gespeichert und beim Expand wiederhergestellt.

**Vermeidung:**
Wenn inline styles für Dimensionen gesetzt werden (bei Drag/Resize), müssen alle Zustandsänderungen (minimize, etc.) ebenfalls über inline styles gesteuert werden, nicht über CSS-Klassen.

---

## Issue: Extension funktioniert nicht in Chrome Native PDF Viewer

**Problem:**
Content Scripts können nicht in den nativen Chrome PDF Viewer injiziert werden.

**Ursache:**
Der Chrome PDF Viewer läuft als isolierter Extension-Context (`chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/...`). Content Scripts mit `<all_urls>` matchen nicht auf Extension-URLs.

**Lösung:**
Nicht behebbar ohne fundamentalen Ansatzwechsel (z.B. PDF-Download intercepten, eigenen Viewer bauen).

**Vermeidung:**
Funktioniert für web-basierte PDF-Viewer (PDF.js, Adobe Acrobat Online) — nur nativer Chrome-Viewer ist betroffen.
