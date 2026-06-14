// jsdom implementiert CSS.escape nicht (im echten Browser vorhanden).
// Standard-Polyfill (Mathias Bynens), nur für die Testumgebung.
if (typeof globalThis.CSS === 'undefined') globalThis.CSS = {};
if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = function (value) {
    const string = String(value);
    const length = string.length;
    let index = -1;
    let codeUnit;
    let result = '';
    const firstCodeUnit = string.charCodeAt(0);
    while (++index < length) {
      codeUnit = string.charCodeAt(index);
      if (codeUnit === 0x0000) { result += '�'; continue; }
      if (
        (codeUnit >= 0x0001 && codeUnit <= 0x001f) || codeUnit === 0x007f ||
        (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
        (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
      ) { result += '\\' + codeUnit.toString(16) + ' '; continue; }
      if (index === 0 && length === 1 && codeUnit === 0x002d) { result += '\\' + string.charAt(index); continue; }
      if (
        codeUnit >= 0x0080 || codeUnit === 0x002d || codeUnit === 0x005f ||
        (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
        (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
        (codeUnit >= 0x0061 && codeUnit <= 0x007a)
      ) { result += string.charAt(index); continue; }
      result += '\\' + string.charAt(index);
    }
    return result;
  };
}

// jsdom macht kein Layout → offsetWidth ist immer 0. isVisible() braucht aber > 0.
// Für die Testumgebung eine positive Breite vortäuschen (display:none/visibility
// werden weiterhin korrekt über getComputedStyle erkannt).
try {
  Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() { return 10; },
  });
} catch { /* falls bereits nicht überschreibbar definiert */ }

// Die Extension-Module sind klassische Skripte im globalen Scope (kein import/export).
// Für die Tests die modulübergreifenden Funktionen/Konstanten als Globals bereitstellen,
// damit z. B. fa-scanner intern `clean()` und fa-fill intern `getLabel()` auflösen kann.
Object.assign(
  globalThis,
  require('../fa-utils.js'),
  require('../fa-profile.js'),
  require('../fa-scanner.js'),
  require('../fa-fill.js'),
);
