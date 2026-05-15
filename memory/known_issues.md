# Known Issues — FormAssist

## Issue: Keine Injection im nativen Chrome PDF Viewer

**Problem:**
Content Scripts laufen nicht im nativen Chrome-PDF-Viewer.

**Ursache:**
Der Viewer läuft in einem isolierten `chrome-extension://`-Kontext, auf den `<all_urls>` nicht angewendet wird.

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

## Issue: Datenschutz-/Consent-Lücke für Produktivbetrieb

**Problem:**
Für KI-Funktionen werden Formular- und ggf. Profildaten an den gewählten Provider gesendet, ohne expliziten per-Form-Consent-Flow.

**Ursache:**
Prototyp-Fokus auf UX/Funktion statt auf rechtlicher Operationalisierung.

**Auswirkung:**
Für echte Produktion fehlen noch verbindliche Privacy- und Compliance-Mechaniken.

---

## Issue: Clientseitiger API-Key ist nur Prototyp-tauglich

**Problem:**
API-Keys liegen im Browser (`chrome.storage.sync`) statt in einem Backend-Proxy.

**Ursache:**
Direkte Integration wurde für schnelles Prototyping priorisiert.

**Auswirkung:**
Betriebsmodell ist für lokale Nutzung ok, für produktiven Rollout aber nicht ausreichend.

---

## Issue: Groq "Provider returned error" (503) — transient

**Problem:**
Gelegentlich antwortet Groq mit HTTP 503 und der Meldung "Provider returned error", wenn ihr Inference-Backend (Meta) temporär nicht erreichbar ist.

**Verhalten heute:**
Nach 3 Retries wird automatisch auf OpenRouter umgeschaltet (sofern OpenRouter-Key konfiguriert). Ohne OpenRouter-Key wird der Fehler im Chat angezeigt.

**Auswirkung:**
Mit konfiguriertem OpenRouter-Backup transparent für den Nutzer; ohne Backup: kurze Fehlermeldung.
