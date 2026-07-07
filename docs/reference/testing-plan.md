<div class="fa-page-hero" markdown>
<span class="fa-kicker">Reference · Quality</span>

# FormAssist — Testing Plan

<p class="fa-lede" markdown>
The testing strategy across FormAssist's isolated runtime contexts — from the current
Vitest unit suite to the broader roadmap for Supabase, E2E, prompt, and security tests.
</p>
</div>

## Overview

FormAssist is a Manifest V3 Chrome extension. Its code runs in three isolated contexts:

**Current implementation status (2026-07-05):** Vitest is set up and verified with
118 passing unit tests across `fa-utils`, `fa-profile`, `fa-scanner`, `fa-fill`, and
`background`. Branch coverage is 78.93% (~79%) for the tested logic modules. The plan
below remains the broader testing roadmap, especially for Supabase, E2E, prompt, and
security tests.

| Context | Files | Testing approach |
|---|---|---|
| Content script | `fa-*.js`, `content.js` | Unit (jsdom) + E2E |
| Service worker | `background.js` | Unit (Node) + integration |
| Options page | `options.html`, `options.js` | Unit (jsdom) + E2E |
| Backend (Supabase) | `supabase_tables.sql` | DB integration |

---

## Recommended Stack

| Layer | Tool | Why |
|---|---|---|
| Unit + DOM | **Vitest** + jsdom environment | Fast, ESM-native, no config overhead |
| Coverage | `@vitest/coverage-v8` | Built into Vitest |
| Chrome API stubs | **jest-chrome** (or manual stubs) | Types the full `chrome.*` surface |
| E2E | **Playwright** + Chromium persistent context | Only browser automation that supports loading unpacked extensions |
| DB schema | **Supabase CLI** (`supabase db test`) | Runs SQL against a local Postgres instance |

---

## 1. Unit Tests — Pure Logic (no DOM, no browser)

> Fastest tests to write and run. Zero external dependencies.

### 1.1 `fa-utils.js`

| Function | Key cases |
|---|---|
| `clean(s)` | `null`, `undefined`, multi-space, leading/trailing whitespace, newlines |
| `formatBytes(n)` | `0`, negative, `NaN`, exact 1 MB, sub-MB (returns bytes), very large |
| `parseDateToISO(text)` | DD.MM.YYYY → YYYY-MM-DD; MM/DD/YYYY → YYYY-MM-DD; already ISO passthrough; invalid string returns `null`; single-digit day/month gets zero-padded |
| `isKendoWidget(el)` | `data-role="dropdown"` maps to `"dropdownlist"`; unknown role returns `null`; no attribute returns `null` |
| `getAgentSelector(el)` | `id` preferred; falls back to `name`; assigns incremental `data-fa-selector-id` when neither present |
| Validator helpers | IBAN mod-97 + country lengths, BIC, email, postal code, phone, birthdate plausibility; tolerant while typing, strict on final/blur |

### 1.2 `background.js`

| Function | Key cases |
|---|---|
| `normalizeProvider(value)` | `"openrouter"`, `"OPENROUTER"`, `"groq"`, `""`, `null`, unknown string → always `"groq"` |
| `normalizeModelForProvider(model, provider)` | Remaps `"openrouter/free"` and `"openrouter/owl-alpha"`; passes through unknown models; ignores remap for groq provider |
| `backoffDelay(attempt, header)` | `attempt=0` → 500 ms; `attempt=4` caps at 12 000 ms; valid `Retry-After: 5` → 5 000 ms; `Retry-After: 0` → 0 ms; `Retry-After: "abc"` falls back to exponential |
| `resolveProviderKey()` | `messageKey` takes priority over storage; returns stored `faGroqApiKey` for groq, `faOpenRouterApiKey` for openrouter; falls back to legacy `faApiKey` |
| `resolveFallbackModel()` | Uses request-level `fallbackModel` for Vision requests; otherwise falls back to the text default |

---

## 2. DOM Unit Tests — Scanner & Filler

> Use Vitest with `environment: 'jsdom'`. Build minimal HTML fixtures inline.

### 2.1 `fa-scanner.js` — `getLabel(el)`

Priority order to test:
1. `aria-label` attribute wins over everything
2. `aria-labelledby` (multi-id space-separated) concatenates correctly
3. `<label for="id">` lookup
4. Ancestor `<label>` wrapping the input
5. `title` attribute fallback
6. `placeholder` fallback
7. `name`/`id` camelCase/kebab-case → human-readable string
8. No identifying attribute → returns `""`

### 2.2 `fa-scanner.js` — `getHint(el)` and `getError(el)`

- `aria-describedby` multi-ID resolution
- Sibling `.hint`, `.help`, `small` elements
- `aria-errormessage` attribute
- Nested `.error`, `.invalid`, `[role="alert"]` containers
- Returns `""` when nothing found

### 2.3 `fa-scanner.js` — `extractField(el)`

- Hidden and submit inputs → returns `null`
- File widget detection via `.inputFile` class and `data-post-url`
- Non-visible element (CSS `display:none`) → returns `null`
- Kendo widget detected → `isKendo: true` in result
- Normal `<input type="text">` → full field object with `label`, `type`, `selector`

### 2.4 `fa-scanner.js` — `matchProfile(el, profile)`

- Autocomplete attribute match (`autocomplete="email"` → `email` key)
- Keyword match in label text (case-insensitive, word-start based; avoids false positives like `Hotelname` → phone)
- No match → returns `null`
- German keywords: `"vorname"`, `"nachname"`, `"postleitzahl"`, etc.

### 2.5 `fa-fill.js` — `fillField(el, value)`

| Input type | Test scenario |
|---|---|
| `<input type="text">` | Value set; `input` and `change` events both dispatched |
| `<input type="date">` | `"01.01.1990"` → `"1990-01-01"` written to `.value` |
| `<select>` | Exact match; partial match; case-insensitive; no match leaves value unchanged |
| `<select multiple>` | Comma-separated values select all matching options |
| `<input type="number">` | German decimal comma and thousands separators normalize to browser-compatible decimal notation |
| `maxlength` | Long values are capped before dispatching events |
| `<input type="checkbox">` | `"ja"`, `"yes"`, `"1"`, `"x"` → checked; `"no"`, `"false"`, `""` → unchecked |
| `<input type="radio">` | Correct radio in group is `.click()`-ed by label; by value fallback |
| React synthetic events | Native value setter called via `Object.getOwnPropertyDescriptor` |

---

## 3. Chrome API Mock Tests

> Stub `globalThis.chrome` using **jest-chrome** or a manual fixture.

### 3.1 `fa-supabase.js`

| Function | Key cases |
|---|---|
| `sbGetConfig()` | Returns config when both URL and key present; returns `null` when either is blank/missing; caches after first call |
| `sbGetDeviceId()` | Generates UUID on first call and persists it; returns same ID on subsequent calls |
| `sbPushProfiles(profiles, activeId)` | Builds correct row array; `is_active` set only for matching `activeProfileId`; calls `sbReq` with `on_conflict` param |
| `sbReq(path, options)` | Returns `null` on non-ok HTTP response; returns `null` and swallows thrown errors; returns `null` on empty body; returns parsed JSON on success |
| `sbDeleteProfile(profileId)` | Constructs correct query string with both `device_id` and `profile_id` filters |
| `sbFetchProfiles()` | Returns `null` when rows is empty/null; maps rows to `{ profiles, activeProfileId }`; `activeProfileId` falls back to first profile when none marked active |

### 3.2 `background.js` — retry and fallback logic

- `fetchProviderWithRetry()` retries exactly `MAX_RETRIES` times on status codes in `RETRYABLE_STATUS` (408, 429, 503…)
- Does **not** retry on 400, 401, 403
- Falls back to OpenRouter with `OPENROUTER_FALLBACK_MODEL` after Groq exhausts retries
- `fetchWithTimeout()` aborts after `timeoutMs` and throws

### 3.3 `background.js` — message handler

- `chrome.runtime.onMessage` handler for `type: "llm-fetch"` returns `{ ok: true, data }` on success
- Returns `{ ok: false, error }` on failure
- Streaming port (`llm-stream`) sends `chunk`, `done`, and `error` message types correctly

---

## 4. E2E Tests — Playwright (unpacked extension in real Chromium)

> Slower but the only way to catch content-script ↔ service-worker ↔ DOM integration bugs.

```js
// Playwright setup skeleton
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});
```

### 4.1 Smart Fill — happy path

1. Serve a local HTML fixture with known fields (first name, email, phone, date of birth)
2. Load a saved profile in the extension options
3. Trigger Smart Fill via `Alt+Shift+S`
4. Assert every field contains the expected profile value

### 4.2 Smart Fill — partial form

- Form has fields the profile does not cover → unfilled fields are left empty, filled fields are correct

### 4.3 Assistant panel open/close

- `Alt+Shift+F` opens the `#formassist-host` shadow DOM element
- Second press closes it
- Clicking the toolbar icon opens it on pages without keyboard focus

### 4.4 Multi-step form detection and auto-advance

- Serve a multi-page form (step 1 → step 2 via "Next" button)
- Enable auto-advance in settings
- Assert the extension clicks "Next" after filling step 1 and then fills step 2

### 4.5 Provider fallback visible in UI

- Configure an invalid Groq key; configure a valid OpenRouter key
- Trigger a fill requiring an LLM call
- Assert the UI shows a fallback notice (OpenRouter label appears)

### 4.6 Options page — profile CRUD

1. Open `options.html`
2. Create a new profile with a custom name and values
3. Reload the page
4. Assert the profile persists (read back from `chrome.storage.sync`)
5. Delete the profile, assert it's gone

### 4.7 Supabase sync (requires a live or local Supabase instance)

- Push a profile, verify it appears in `fa_profiles` table
- Delete a profile, verify the row is removed
- Fetch profiles from a second "device" with a different UUID → no cross-contamination

---

## 5. Database / Schema Tests

> Run against a local Supabase instance started with `supabase start`.

| Test | Assertion |
|---|---|
| `fa_profiles` upsert conflict | Two rows with the same `(device_id, profile_id)` merge, not duplicate |
| `is_active` isolation | Only one row per `device_id` should realistically be active (app-level invariant, consider adding a partial unique index) |
| `fa_history` order + limit | `order=ts.desc&limit=30` returns at most 30 rows, newest first |
| Device isolation | Querying with `device_id=X` never returns rows with `device_id=Y` |
| RLS policy | Anonymous client (`anon` key) can read and write own rows; verify the policy is not accidentally open to other devices' data at the SQL level |
| `form_fields` read-only policy | `INSERT`/`UPDATE`/`DELETE` blocked for the anon key |

---

## 6. Prompt / LLM Output Tests

> No live API calls needed — mock the LLM response.

### 6.1 `buildSystemPrompt()` snapshot

Lock down the prompt structure for a known set of extracted fields. Run `buildSystemPrompt()` with a fixture context object and snapshot the output. Any structural change to the prompt (field order, section headers, profile injection) will break the snapshot → must be an intentional update.

### 6.2 LLM response parsing

Test the JSON parsing logic in `content.js` against:
- Valid JSON with all expected keys
- Valid JSON with extra/unknown keys (should be ignored gracefully)
- Valid JSON with wrong value types (number where string expected)
- Bare markdown code-fenced JSON (` ```json\n{...}\n``` `)
- Completely invalid JSON → no crash, graceful error shown in UI

### 6.3 Token budget

- Run `buildSystemPrompt()` with a 100-field form and a full profile
- Assert the prompt is under the model's context limit (no hard check today, but worth logging the character count in CI)

---

## 7. Security-Focused Tests

| Concern | Test |
|---|---|
| API key leakage | Assert `chrome.storage.sync` keys (`faApiKey`, `faGroqApiKey`, etc.) are never written to `localStorage`, `sessionStorage`, or the DOM |
| XSS via form label | `getLabel()` called on an element with `aria-label='<img src=x onerror=alert(1)>'` — assert the result is treated as text, never inserted as HTML |
| Supabase URL injection | `faSupabaseUrl` set to a malicious URL — assert `sbReq` only constructs URLs that start with the configured base |
| Device ID entropy | `sbGetDeviceId()` generates a `crypto.randomUUID()` value, not `Math.random()` |

---

## Implementation Phases

| Phase | Scope | Effort |
|---|---|---|
| **Phase 1** | Unit tests for `fa-utils.js` and `background.js` pure functions | Implemented, extend as helpers change |
| **Phase 2** | DOM tests for `fa-scanner.js` (`getLabel`, `extractField`, `matchProfile`) | Implemented for core + v2.1 robustness cases |
| **Phase 3** | DOM tests for `fa-fill.js` (`fillField` all input types) | Implemented for core + v2.1 robustness cases |
| **Phase 4** | Chrome API mock tests for `fa-supabase.js` and background message handler | ~2 days |
| **Phase 5** | Playwright E2E — happy path Smart Fill + options CRUD | ~3 days |
| **Phase 6** | DB schema tests, prompt snapshot tests, security tests | ~2 days |

---

## File Structure Suggestion

```
tests/
├── unit/
│   ├── fa-utils.test.js
│   ├── fa-fill.test.js
│   ├── fa-scanner.test.js
│   ├── fa-profile.test.js
│   ├── fa-supabase.test.js
│   └── background.test.js
├── e2e/
│   ├── smart-fill.spec.js
│   ├── options-page.spec.js
│   ├── multi-step.spec.js
│   └── fixtures/
│       ├── simple-form.html
│       └── multistep-form.html
└── db/
    └── schema.test.sql
```

---

## Quick Start

```bash
# Install
npm init -y
npm install -D vitest jsdom @vitest/coverage-v8 jest-chrome @playwright/test

# Run unit tests
npx vitest run

# Run with coverage
npx vitest run --coverage

# Run E2E
npx playwright test
```

Add to `vitest.config.js`:

```js
export default {
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: { reporter: ['text', 'html'] },
  },
};
```
