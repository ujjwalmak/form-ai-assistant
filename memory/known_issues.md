# Known Issues — FormAssist

## Issue: Keine Injection im nativen Chrome PDF Viewer

**Problem:**
Content Scripts laufen nicht im nativen Chrome-PDF-Viewer.

**Ursache:**
Der Viewer laeuft in einem isolierten `chrome-extension://`-Kontext, auf den `<all_urls>` nicht angewendet wird.

**Auswirkung:**
FormAssist funktioniert dort nicht, in web-basierten PDF-Viewern jedoch oft schon.

---

## Issue: Cross-Origin iFrames sind nicht analysierbar

**Problem:**
Formularfelder in fremden iFrames werden nicht ausgelesen.

**Ursache:**
Same-Origin-Policy verhindert Zugriff auf `iframe.contentDocument`.

**Auswirkung:**
Agent/Chat sehen nur Hauptdokument und same-origin-iFrames.

---

## Issue: Datenschutz-/Consent-Luecke fuer Produktivbetrieb

**Problem:**
Fuer KI-Funktionen werden Formular- und ggf. Profildaten an Groq gesendet, ohne expliziten per-Form-Consent-Flow.

**Ursache:**
Prototyp-Fokus auf UX/Funktion statt auf rechtlicher Operationalisierung.

**Auswirkung:**
Fuer echte Produktion fehlen noch verbindliche Privacy- und Compliance-Mechaniken.

---

## Issue: Clientseitiger API-Key ist nur Prototyp-tauglich

**Problem:**
API-Key liegt im Browser (`chrome.storage.sync`) statt in einem Backend-Proxy.

**Ursache:**
Direkte Integration wurde fuer schnelles Prototyping priorisiert.

**Auswirkung:**
Betriebsmodell ist fuer lokale Nutzung ok, fuer produktiven Rollout aber nicht ausreichend.
