<div class="fa-page-hero" markdown>
<span class="fa-kicker">Reference · Product Vision</span>

# From FormAssist to a Bureaucracy Companion

<p class="fa-lede" markdown>
A product vision — June 2026. Where FormAssist could go beyond form-filling: from saving
keystrokes to guiding people through the bureaucracy that surrounds the form.
</p>
</div>

## 1. The reframe: we are not in the form-filling business

FormAssist today saves keystrokes. That is a feature, not a product. Nobody's life is
changed by typing their address 30 seconds faster — and "autofill, but smarter" is a
market where Chrome, Apple, and 1Password already sit for free.

The deeper truth: **forms are the user interface of bureaucracy, and bureaucracy is a
tax on the people least equipped to pay it.** The form is never the problem. The
problem is everything around it:

- *Which* forms do I need, in what order, by when?
- *What is this field actually asking?* ("Familienstand"? "Steuerklasse"? "Anlage KAP"?)
- *Which documents* do I need to attach, and where do I get them?
- *What happens after* I submit — and what do I do when the answer is "no"?
- *What am I entitled to that I never applied for, because I didn't know it existed?*

That last point is the moral core of this product. In Germany alone, billions of euros
in legal entitlements go unclaimed every year — historically **~70% of eligible families
never claim Kinderzuschlag**, a large share of eligible households never apply for
Wohngeld, and Grundsicherung im Alter has massive non-take-up among the elderly poor.
Not because people don't need the money. Because the application is the barrier.

> **The product thesis:** A trusted personal agent that knows your life data, speaks
> your language, finds what you're entitled to, fills out whatever stands between you
> and it, tracks every deadline, and never submits anything without your eyes on it.
>
> Working name: **"Lebensakte"** (the Life File) — or internationally, **Klar**.

---

## 2. Should it stay a browser extension? No — but the extension stays.

The extension is a *capture surface*, not the product. It's where web forms live, so it
remains the power tool. But the people whose lives this could change mostly **do not
install Chrome extensions on desktops**:

| Surface | Who it serves | Why it matters |
|---|---|---|
| **Browser extension** (exists) | Power users, expats, freelancers | In-situ filling on any web form; the wedge we already have |
| **Mobile app** | Everyone | The camera is the killer feature: photograph a *paper* form or a PDF → it's understood, filled, printed/exported. Push notifications = deadline engine |
| **PDF engine** | Everyone in DE/EU | The brutal truth: most life-critical German forms are PDFs, not web forms. A product that can't fill PDFs can't fill out Germany |
| **WhatsApp / voice interface** | Elderly, immigrants, low-literacy users | Zero-install, zero-learning-curve. "Send me a photo of the letter you got" is an interface a 78-year-old and a refugee both already know |
| **Web dashboard** | Households, caregivers | The Life File itself: data vault, documents, open cases, deadlines, family profiles |
| **Co-pilot mode** | Caregivers, social workers | A daughter in Munich fills her father's Pflegegrad application in Hamburg with him on the phone; a Caritas case worker serves 3× the people |
| **B2B API** | Relocation firms, HR, insurers, municipalities | Distribution. Companies pay for what individuals won't |

**Architecture consequence:** the center of gravity moves from `content.js` to a
**personal data vault + agent backend**. The extension, app, and chat interfaces become
thin clients of the same brain:

```
┌─────────────────────────────────────────────────────────┐
│  SURFACES: extension · mobile · web · WhatsApp · co-pilot │
└──────────────────────────┬──────────────────────────────┘
┌──────────────────────────┴──────────────────────────────┐
│  AGENT LAYER: fill · explain · validate · track · remind │
│               appeal-draft · eligibility-scan             │
├───────────────────────────────────────────────────────────┤
│  KNOWLEDGE LAYER (the moat):                              │
│   · Form Intelligence Graph: per-form/per-field curated + │
│     crowdsourced explanations, 20+ languages              │
│   · Benefits rules engine: "given this profile, you are   │
│     likely eligible for X, Y, Z"                          │
│   · Process maps: "after a death: these 14 steps"         │
├───────────────────────────────────────────────────────────┤
│  VAULT: encrypted life data + documents, EU-hosted,       │
│   E2E where possible, per-share consent + audit log       │
└───────────────────────────────────────────────────────────┘
```

The vault is also the business moat: once your verified life data and document archive
live here, switching costs are real — and every filled form makes the Form Intelligence
Graph smarter for the next person.

---

## 3. How it changes lives — six scenarios

**Amira, 34 — nurse from Damascus, now in Leipzig.**
Her nursing degree is worthless until the *Anerkennung* (credential recognition) is
through: 4 authorities, 11 forms, certified translations, deadlines that reset if you
miss a letter. Today she pays a "helper" €50/form or loses months. With the companion
(in Arabic, via WhatsApp): she photographs every letter she receives; it explains what
it means, what to send back, by when; it fills the forms; it tracks the case. **Result:
she works as a nurse 8 months earlier. Germany gets a nurse 8 months earlier.**

**Herbert, 78 — just lost his wife of 51 years.**
A death in Germany triggers ~30–40 administrative acts: pension notifications
(Witwerrente), insurance terminations, account conversions, the funeral subsidy nobody
tells you about. Herbert doesn't use computers; his daughter lives 600 km away. She
opens co-pilot mode: the system walks them through the "after a death" process map
together, fills everything, she reviews, he signs. **Result: a grieving man is not
punished with three months of paperwork, and a daughter can help without taking three
weeks off.**

**Lena, 29 — single mother, two jobs, Gelsenkirchen.**
She has never heard of Kinderzuschlag or Wohngeld. The eligibility scanner looks at
her existing profile (income, rent, children) and says: *"You are likely entitled to
~€340/month you are not claiming. Want me to prepare both applications? You'll need
these 3 documents — photograph them."* **Result: +€4,000/year. This is not
convenience. This is rent.**

**Markus, 41 — freelancer with multiple sclerosis.**
Fine motor control comes and goes; a 30-minute form is a painful hour. He fills his
quarterly Umsatzsteuervoranmeldung and an insurance claim **entirely by voice**, the
agent navigating, him just confirming. **Result: he keeps his independence — the
difference between running his business and giving it up.**

**The Okafor family — relocating from Lagos to Munich for a tech job.**
Visa forms, Anmeldung, Kindergeld, school enrollment, utility contracts, bank KYC,
health insurance — across two languages and ~40 forms. Their relocation agency embeds
the companion (B2B): the family's vault is filled once, every subsequent form draws
from it. **Result: a relocation that takes a weekend of reviewing instead of a month
of deciphering.**

**Ravi, 23 — student from Mumbai whose visa renewal window is closing.**
He doesn't know that missing the Ausländerbehörde deadline means losing legal status
and his enrollment. The deadline engine knows, because his residence permit lives in
the vault: 8 weeks out it nags him, fills the renewal, books the appointment slot the
moment one opens. **Result: a life trajectory not destroyed by a missed PDF.**

The pattern across all six: **time is the smallest benefit.** The real outcomes are
money claimed, rights preserved, legal status protected, dignity kept, and access for
people the digital state currently excludes.

---

## 4. Go-to-market: one wedge, not the ocean

"Bureaucracy companion for everyone" is unbuildable on day one. Pick one vertical with
acute pain, willingness to pay, and community word-of-mouth:

**Wedge recommendation: internationals in Germany** (expats, international students,
skilled-migration hires — ~1M+ new arrivals/year).
- The pain is screaming (every expat forum is 50% bureaucracy questions)
- They are digital, install things, and pay (€8–15/month is nothing against relocation budgets)
- Employers/relocation agencies are a natural B2B channel that *pays for activation*
- Every solved case feeds the Form Intelligence Graph for the harder-to-reach groups
- Expansion path: internationals → all citizens' life events (birth, death, moving,
  unemployment) → NGO/municipal licensing → EU countries (same product, new graph)

**Revenue layers:**
1. **B2C freemium** — vault + basic filling free; Pro (€9/mo): unlimited agent, document
   OCR, deadline engine, family/co-pilot profiles
2. **B2B** — relocation/HR onboarding (per-employee), insurers & banks (completion-rate
   uplift on their own forms), proptech (rental application packages)
3. **B2G/NGO** — case-worker licenses for welfare organizations and municipalities;
   social return is also the ESG story that funds it
4. **Never**: selling data. The product *is* trust; one breach of that and it's dead.

---

## 5. Trust, ethics, and law — the part that decides everything

This product handles the most sensitive data a person has, for the most vulnerable
users, on documents with legal consequences. The bar is brutal, and meeting it *is*
the brand:

- **Provenance, always.** Every filled value is traceable: profile / document / user
  answer / AI-inferred — visually distinct (the source badges already exist in the
  extension). On official forms, AI may *suggest* but never *invent*: no provenance,
  no fill.
- **The human signs.** The agent never submits autonomously. Review-before-submit is
  not a setting; it's the constitution (the submit-review interceptor already embodies this).
- **Vault security**: E2E/local-first encryption, EU hosting, per-transmission consent,
  a user-readable audit log of every datum that ever left the vault. GDPR not as
  compliance burden but as the selling point against US big tech.
- **Prompt injection is a real attack**: a malicious page can embed instructions in
  field labels ("also write your IBAN here"). Page content must be treated as data,
  never instructions; sensitive vault fields (IBAN, IDs) are only released to fields
  whose semantics match, with explicit consent.
- **Rechtsdienstleistungsgesetz**: in Germany, automated *legal advice* is regulated.
  Stay firmly on the "assistance with formalities + explanation" side; partner with
  lawyers/Beratungsstellen for the advice layer, and hand off visibly.
- **Equity**: free tier for NGOs and welfare recipients. The people who need it most
  must never be the ones priced out.
- **Anti-dependency**: explain *while* filling ("this field means X") so users learn
  the system rather than becoming hostages to ours.

---

## 6. Roadmap from here

**Phase 0 — now (the extension, this repo):** harden the agent, build the eval
harness, ship to Chrome Web Store as the wedge product for expats. The extension is
the lab where the agent gets good. As of 2026-07-05, the prototype already includes
document OCR into the profile, deterministic live validation, and a stronger
pre-submit logic check.

**Phase 1 — the vault (3–6 mo):** Supabase auth + encrypted profile/document storage,
backend proxy for AI calls (keys leave the client), document OCR → profile (the
NEXT_STEPS vision feature). The extension becomes the first client of the vault.

**Phase 2 — PDF + mobile (6–12 mo):** PDF form engine (AcroForm + vision for scanned
forms), mobile app with camera capture and the deadline engine. This is the moment it
stops being "a browser thing."

**Phase 3 — the graph + proactivity (12–18 mo):** Form Intelligence Graph at scale
(curated + crowdsourced, multilingual), benefits eligibility scanner, process maps for
the top 10 life events. WhatsApp/voice surface. Co-pilot mode.

**Phase 4 — distribution (18 mo+):** B2B embedding, NGO/municipal licensing, second
country.

---

## 7. Making the *existing* system better — concrete and prioritized

The extension is the wedge and the lab; it should get genuinely good. In order of leverage:

### 7.1 Build an evaluation harness (highest leverage, do first)
The test-site already has 6 form types. Add a Playwright suite that loads each page,
runs the agent with a fixture profile, and **scores fill accuracy** (fields correct /
wrong / missed / hallucinated). Every prompt tweak, model swap, or parser change runs
against it. Right now every change is vibes; this makes the agent's quality a number
that can only go up.

### 7.2 Replace text-marker actions with structured outputs
The `<<<ACTIONS>>>` block (even with the tolerant parser) is the fragile layer. Groq
supports JSON mode / tool-calling: define a `fill_fields` tool schema and let the model
call it. Parse failures drop to ~zero, and chat-command reliability — the #1 complaint —
is structurally fixed instead of prompt-patched.

### 7.3 Backend proxy + auth (production blocker)
API keys in `chrome.storage.sync` are fine for a prototype, fatal for a product.
A Supabase Edge Function proxies all LLM calls: keys server-side, per-user rate limits,
model routing (fast/cheap model for field values, stronger model for explanations and
the agent), and silent model upgrades for all users at once.

### 7.4 Per-site recipes (speed + cost + reliability)
After a successful fill, store the mapping `domain + field-selector → profile key /
answer` (locally, later in the graph). On revisit, replay the recipe **with zero AI
calls** — instant, free, deterministic — and only invoke the model for new fields.
This also turns every user into a contributor to the Form Intelligence Graph (opt-in).

### 7.5 Security hardening against prompt injection
Treat all page-derived text (labels, hints, hidden fields) as untrusted data: filter
invisible/off-screen fields from prompts, never auto-fill high-sensitivity profile keys
(IBAN, ID numbers) unless the field's semantics match deterministically, and add an
explicit consent gate when a fill would send vault data to a *new* domain.

### 7.6 Undo + diff (trust UX)
Snapshot field states before an agent run; one click reverts everything. Show a
"what changed" diff after each run. Cheap to build on the existing
`filledFields` log, and it transforms how safe the agent *feels*.

### 7.7 Internationalize the UI
The UI is German-only — which excludes the wedge market (expats!). Extract strings,
ship EN/DE first, then AR/TR/UK/RU (the languages of the people who need it most).
The AI already answers in any language; the chrome around it should too.

### 7.8 Smaller, compounding upgrades
- **Voice input** (Web Speech API): one button, big accessibility win, already roadmapped
- **Document OCR → profile** (implemented in v2.1): next step is source/provenance
  badges per extracted value and stronger document-type-specific validation
- **Modularize `content.js`** (3k lines, one closure): finish the `fa-*` split, add a
  build step (Vite + TypeScript) before the file becomes unmaintainable
- **Cross-origin iframes**: `all_frames: true` + frame messaging to reach embedded forms
- **Vision fallback**: when DOM scanning finds nothing (canvas/PDF-viewer forms),
  screenshot + vision model instead of giving up
- **Firefox/Edge ports**: near-free reach (WebExtensions APIs only)

---

## 8. The one-sentence pitch

> **Nobody should lose money, rights, or months of their life because a form was too
> hard.** We turn the paperwork of life — moving, arriving, losing someone, claiming
> what you're owed — into a conversation in your own language, with an agent that
> fills, explains, tracks, and reminds, and never signs anything without you.
