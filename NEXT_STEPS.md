# FormAssist — Next Steps & Roadmap

## 1. Document Upload (Vision OCR)

**What:** A button in the sidebar lets the user upload a photo of their ID card, passport, or any personal document. A vision-capable LLM reads the image and extracts the data directly into the profile or the current form — no typing required.

**How:**
- `<input type="file" accept="image/*">` inside the Shadow DOM sidebar
- `FileReader.readAsDataURL()` → base64 (with client-side resize to keep payloads small)
- `background.js` sends the vision message format: `content: [{ type: "image_url" }, { type: "text" }]`
- Model returns structured JSON matching `PROFILE_FIELDS` keys
- Extension maps values → profile save or direct form fill

**Models (both free):**
- Groq: `meta-llama/llama-4-scout-17b-16e-instruct` (free tier, vision capable)
- OpenRouter: `google/gemma-4-31b-it` or `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (free, strong OCR)

**Cost:** < $0.001 per scan even on paid tiers.

---

## 2. Supabase Auth (OAuth)

**What:** Replace the current device-UUID "identity" with real user accounts. A logged-in user can access their profile and history from any device/browser, not just the one where the UUID was first generated.

**How:**
- Supabase Auth with Google OAuth (or magic link via email)
- Auth flow opens `options.html` or a small popup for sign-in
- Replace `device_id` column with `user_id` (Supabase Auth UID)
- Update RLS policies to `auth.uid() = user_id` — data is truly private per user

**Why it matters:** With UUID, losing the browser profile means losing access to the synced data. With OAuth, the account is permanent and portable.

---

## 3. Form Field Tips Database (`form_fields`)

**What:** The Supabase `form_fields` table already exists with test data for `service.berlin.de` and `www.roboform.com`. When the user focuses a field, FormAssist shows a green badge with a curated tip — e.g. "This field expects your registered address, not a PO box."

**How:** Already fully designed. When the user focuses a field, fetch tips for `location.hostname` from Supabase, match by label, show badge in the input area.

**Why it matters:** Turns FormAssist from a fill-tool into a fill-and-understand tool. Especially valuable for government forms where field labels are ambiguous. This is also the foundation for a community/crowdsourced knowledge base.

**Data already in Supabase:**
- `service.berlin.de` — vorname, nachname, geburtsdatum, e-mail, straße (DE/EN/FR/TR tips)
- `www.roboform.com` — first name, last name, email, phone, address, city, zip

---

## 4. Live AI Validation While Typing

**What:** As the user types into a field, the AI warns in real time — "This postal code doesn't exist in Bavaria", "Your move-in date is 10 years in the future", "IBAN checksum invalid."

**How:** Debounced `input` event listener → quick AI call with the field value and label → inline warning badge if an issue is found.

**Why it matters:** Catches logical errors before submission. Especially powerful for fields with domain-specific rules (dates, codes, IBANs).

---

## 5. Voice Input

**What:** A microphone button lets the user fill fields by speaking. "My address is Musterstraße 42 in Berlin" → AI maps the answer to the correct fields and fills them.

**How:**
- Web Speech API (`SpeechRecognition`) — no server needed for transcription
- Transcript sent to LLM with current form context → JSON of field → value mappings
- Same `fillField()` pipeline as the agent

---

## 6. Team / Enterprise Mode

**What:** A company deploys FormAssist for all employees. An admin account maintains shared answer templates — "Our company address is always X, our VAT number is Y." All employees get these pre-filled automatically.

**How:** Supabase multi-tenancy: `team_id` on profiles and a `team_templates` table. Admin UI in `options.html`. Requires OAuth (step 2) first.

---

## 7. RAG over Personal Documents

**What:** The user uploads their CV, Steuerbescheid, or rental contract. When filling a form, FormAssist retrieves the relevant passage and fills the field — e.g. "Previous employer" gets auto-filled from the CV without the user storing it in the profile.

**How:**
- Documents chunked and embedded (Supabase pgvector extension)
- On each field, embed the field label → semantic search → retrieve relevant chunk → fill
- Nothing leaves the user's Supabase instance

**Why it matters:** Handles edge-case fields the profile doesn't cover. Makes FormAssist genuinely useful for complex bureaucratic forms.

---

## 8. Production Packaging

**What:** Move from a dev-loaded extension to a publishable product.

- **Backend proxy:** API keys move server-side (Supabase Edge Functions or a small server). No more keys in `chrome.storage.sync`. Rate limiting and abuse prevention possible.
- **Consent flow:** Explicit Datenschutz notice per form before the agent sends data to the LLM.
- **Chrome Web Store:** The manifest is already MV3-compliant. Needs icons, screenshots, and a privacy policy.
- **Firefox support:** The extension uses only Web Extensions APIs — a Firefox port is low effort.
