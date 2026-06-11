"use client";
import { useState } from "react";
import { useWizard, WizardShell, Field, Input, Select, Textarea, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Text Fields", "Date & Time", "Selections", "Radio Groups", "Checkboxes & Range", "Files & Final"];

/* ── Step 1: Text / Email / Tel / URL / Number / Password ──────────── */
function StepText() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests every text-like input type: text, email, tel, url, number, password, search, textarea.
      </p>

      <Field label="Full Name" required htmlFor="s-fullname">
        <Input id="s-fullname" type="text" autoComplete="name" placeholder="Your full name" />
      </Field>

      <Field label="Email Address" required htmlFor="s-email">
        <Input id="s-email" type="email" autoComplete="email" placeholder="you@example.com" />
      </Field>

      <Field label="Phone Number" htmlFor="s-phone">
        <Input id="s-phone" type="tel" autoComplete="tel" placeholder="+1 555 000 0000" />
      </Field>

      <Field label="Website URL" htmlFor="s-url">
        <Input id="s-url" type="url" autoComplete="url" placeholder="https://example.com" />
      </Field>

      <Field label="Age" htmlFor="s-age" hint="Must be 18 or older">
        <Input id="s-age" type="number" min="18" max="120" placeholder="e.g. 25" ariaDescribedBy="s-age-hint" />
      </Field>

      <Field label="Monthly Budget (€)" htmlFor="s-budget">
        <Input id="s-budget" type="number" min="0" step="50" placeholder="e.g. 1500" />
      </Field>

      <Field label="Create Password" htmlFor="s-password">
        <Input id="s-password" type="password" autoComplete="new-password" placeholder="Min 8 characters" />
      </Field>

      <Field label="Search Query" htmlFor="s-search">
        <Input id="s-search" type="search" placeholder="Search for topics…" />
      </Field>

      <Field label="Bio / About You" htmlFor="s-bio">
        <Textarea id="s-bio" rows={4} placeholder="Tell us a bit about yourself…" />
      </Field>
    </div>
  );
}

/* ── Step 2: Date / Time / Month / Week / Datetime-local ────────────── */
function StepDateTime() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests all date/time input variants: date, time, month, week, datetime-local. Tests <code>parseDateToISO()</code> conversion logic.
      </p>

      <Field label="Date of Birth" required htmlFor="dt-dob">
        <Input id="dt-dob" type="date" autoComplete="bday" />
      </Field>

      <Field label="Appointment Time" htmlFor="dt-time">
        <Input id="dt-time" type="time" />
      </Field>

      <Field label="Start Month" htmlFor="dt-month" hint="Select starting month and year">
        <Input id="dt-month" type="month" ariaDescribedBy="dt-month-hint" />
      </Field>

      <Field label="Preferred Week" htmlFor="dt-week">
        <Input id="dt-week" type="week" />
      </Field>

      <Field label="Exact Date & Time (Datetime Local)" htmlFor="dt-local">
        <Input id="dt-local" type="datetime-local" />
      </Field>

      {/* Plain text date — tests parseDateToISO conversion */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ Plain text input for date — tests <code>parseDateToISO()</code> with formats DD.MM.YYYY and MM/DD/YYYY</p>
        <label htmlFor="dt-text-date" className="block text-sm font-medium text-gray-700 mb-1">
          Event Date (DD.MM.YYYY format)
        </label>
        <input
          id="dt-text-date"
          name="dt-text-date"
          type="text"
          placeholder="e.g. 31.12.2025"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="dt-us-date" className="block text-sm font-medium text-gray-700 mb-1">
          Event Date (MM/DD/YYYY format)
        </label>
        <input
          id="dt-us-date"
          name="dt-us-date"
          type="text"
          placeholder="e.g. 12/31/2025"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
      </div>

      <Field label="Expiry Date (Already ISO — passthrough)" htmlFor="dt-iso">
        <Input id="dt-iso" type="text" placeholder="2025-12-31" />
      </Field>
    </div>
  );
}

/* ── Step 3: Select & Multi-select ──────────────────────────────────── */
function StepSelections() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests single selects, optgroup selects, multi-select, and <code>fillField</code> partial/case-insensitive match.
      </p>

      <Field label="Country of Residence" required htmlFor="sel-country">
        <Select id="sel-country" autoComplete="country">
          <option value="">Select country…</option>
          <option value="AT">Austria</option>
          <option value="DE">Germany</option>
          <option value="CH">Switzerland</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="FR">France</option>
          <option value="NL">Netherlands</option>
          <option value="OTHER">Other</option>
        </Select>
      </Field>

      <Field label="Primary Language" htmlFor="sel-language">
        <Select id="sel-language">
          <optgroup label="Germanic">
            <option value="en">English</option>
            <option value="de">German / Deutsch</option>
            <option value="nl">Dutch / Nederlands</option>
          </optgroup>
          <optgroup label="Romance">
            <option value="fr">French / Français</option>
            <option value="es">Spanish / Español</option>
            <option value="it">Italian / Italiano</option>
          </optgroup>
          <optgroup label="Other">
            <option value="zh">Chinese / 中文</option>
            <option value="ja">Japanese / 日本語</option>
            <option value="ar">Arabic / العربية</option>
          </optgroup>
        </Select>
      </Field>

      <Field label="Time Zone" htmlFor="sel-timezone">
        <Select id="sel-timezone">
          <option value="">Select time zone…</option>
          <option value="UTC-8">UTC-8 (Los Angeles)</option>
          <option value="UTC-5">UTC-5 (New York)</option>
          <option value="UTC+0">UTC+0 (London)</option>
          <option value="UTC+1">UTC+1 (Vienna / Berlin)</option>
          <option value="UTC+2">UTC+2 (Helsinki)</option>
          <option value="UTC+8">UTC+8 (Beijing)</option>
          <option value="UTC+9">UTC+9 (Tokyo)</option>
        </Select>
      </Field>

      {/* Multi-select */}
      <div className="mb-4">
        <label htmlFor="sel-interests" className="block text-sm font-medium text-gray-700 mb-1">
          Areas of Interest <span className="text-gray-400 text-xs">(hold Ctrl/Cmd for multiple)</span>
        </label>
        <select
          id="sel-interests"
          name="sel-interests"
          multiple
          size={6}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="tech">Technology</option>
          <option value="finance">Finance & Investment</option>
          <option value="health">Health & Wellness</option>
          <option value="environment">Environment & Sustainability</option>
          <option value="education">Education & Research</option>
          <option value="arts">Arts & Culture</option>
          <option value="sports">Sports & Fitness</option>
          <option value="travel">Travel & Hospitality</option>
        </select>
      </div>

      <Field label="Priority Level" htmlFor="sel-priority">
        <Select id="sel-priority">
          <option value="">Select priority…</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </Select>
      </Field>

      <Field label="Department" htmlFor="sel-department">
        <Select id="sel-department">
          <option value="">Select department…</option>
          <option value="engineering">Engineering</option>
          <option value="product">Product</option>
          <option value="design">Design</option>
          <option value="marketing">Marketing</option>
          <option value="sales">Sales</option>
          <option value="hr">Human Resources</option>
          <option value="finance-dept">Finance</option>
          <option value="legal">Legal</option>
          <option value="operations">Operations</option>
        </Select>
      </Field>
    </div>
  );
}

/* ── Step 4: Radio Groups ───────────────────────────────────────────── */
function StepRadios() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests <code>fillField</code> for radio inputs — matches by label text and by value fallback.
      </p>

      {[
        {
          name: "experience-level",
          legend: "Experience Level",
          opts: [
            { value: "beginner", label: "Beginner (0–1 years)" },
            { value: "intermediate", label: "Intermediate (2–4 years)" },
            { value: "advanced", label: "Advanced (5–9 years)" },
            { value: "expert", label: "Expert (10+ years)" },
          ],
        },
        {
          name: "satisfaction",
          legend: "Overall Satisfaction",
          opts: [
            { value: "1", label: "1 — Very dissatisfied" },
            { value: "2", label: "2 — Dissatisfied" },
            { value: "3", label: "3 — Neutral" },
            { value: "4", label: "4 — Satisfied" },
            { value: "5", label: "5 — Very satisfied" },
          ],
        },
        {
          name: "contact-preference",
          legend: "Preferred Contact Method",
          opts: [
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone call" },
            { value: "sms", label: "SMS / Text" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "none", label: "Do not contact" },
          ],
        },
        {
          name: "news-frequency",
          legend: "Newsletter Frequency",
          opts: [
            { value: "daily", label: "Daily digest" },
            { value: "weekly", label: "Weekly summary" },
            { value: "monthly", label: "Monthly roundup" },
            { value: "never", label: "Never" },
          ],
        },
      ].map(({ name, legend, opts }) => (
        <fieldset key={name} className="border border-gray-200 rounded-xl p-4">
          <legend className="text-sm font-semibold text-gray-700 px-1">{legend}</legend>
          <div className="flex flex-wrap gap-4 mt-2">
            {opts.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={name} value={value} className="accent-teal-600" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

/* ── Step 5: Checkboxes & Range ─────────────────────────────────────── */
function StepCheckboxes() {
  const [ranges, setRanges] = useState({ importance: 5, speed: 5, quality: 5 });
  const set = (k, v) => setRanges((r) => ({ ...r, [k]: v }));

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests checkbox truthy values (<code>&quot;ja&quot;</code>, <code>&quot;yes&quot;</code>, <code>&quot;1&quot;</code>, <code>&quot;x&quot;</code>) and range sliders.
      </p>

      <fieldset className="border border-gray-200 rounded-xl p-4">
        <legend className="text-sm font-semibold text-gray-700 px-1">Features You Use Regularly</legend>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            "Dashboard Analytics", "Automated Reports", "API Integration",
            "Team Collaboration", "Mobile App", "Browser Extension",
            "Webhook Notifications", "SSO / SAML Login", "2FA / MFA",
            "Data Export (CSV/Excel)", "Custom Branding", "Audit Logs",
          ].map((feat) => (
            <label key={feat} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="features" value={feat.toLowerCase().replace(/ /g, "-")} className="accent-teal-600" />
              {feat}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border border-gray-200 rounded-xl p-4">
        <legend className="text-sm font-semibold text-gray-700 px-1">Notification Preferences</legend>
        <div className="space-y-2 mt-2">
          {[
            { id: "notif-email", label: "Email notifications", value: "ja" },
            { id: "notif-push", label: "Push notifications", value: "yes" },
            { id: "notif-sms", label: "SMS alerts", value: "1" },
            { id: "notif-slack", label: "Slack notifications", value: "x" },
            { id: "notif-mute", label: "Mute all notifications", value: "no" },
          ].map(({ id, label, value }) => (
            <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" id={id} name={id} value={value} className="accent-teal-600" />
              <span>{label}</span>
              <span className="text-xs text-gray-400 ml-1">(value=&quot;{value}&quot;)</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Rate the Following (1–10)</h3>

        {[
          { key: "importance", label: "Importance of this feature to you" },
          { key: "speed", label: "System performance & speed" },
          { key: "quality", label: "Overall quality & reliability" },
        ].map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <label htmlFor={`range-${key}`} className="font-medium text-gray-700">{label}</label>
              <span className="font-bold text-teal-600">{ranges[key]}</span>
            </div>
            <input
              id={`range-${key}`}
              name={`range-${key}`}
              type="range"
              min="1"
              max="10"
              step="1"
              value={ranges[key]}
              onChange={(e) => set(key, Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>1</span><span>5</span><span>10</span>
            </div>
          </div>
        ))}
      </div>

      <Field label="Color Preference" htmlFor="color-pick">
        <div className="flex items-center gap-3">
          <input id="color-pick" name="color-pick" type="color" defaultValue="#6366f1"
            className="w-12 h-10 rounded cursor-pointer border border-gray-300" />
          <label htmlFor="color-pick" className="text-sm text-gray-600">Pick your preferred theme color</label>
        </div>
      </Field>
    </div>
  );
}

/* ── Step 6: Files & Final ──────────────────────────────────────────── */
function StepFiles() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-teal-50 rounded-lg p-3">
        Tests: file upload with <code>.inputFile</code> class and <code>data-post-url</code>, hidden inputs (should be skipped), submit-type input (should be skipped).
      </p>

      {/* Should be skipped by extractField */}
      <input type="hidden" name="session-token" value="abc123xyz" />
      <input type="hidden" name="form-version" value="v4.2" />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-400 transition">
          <input id="photo-upload" name="photo-upload" type="file"
            accept="image/png,image/jpeg,image/webp"
            className="inputFile w-full text-sm text-gray-600"
            data-post-url="/api/upload/photo"
          />
          <p className="text-xs text-gray-400 mt-2">PNG, JPG, WebP — max 2 MB</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Documents (multiple)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-teal-400 transition">
          <input id="docs-upload" name="docs-upload" type="file"
            accept=".pdf,.doc,.docx,.xlsx,.csv"
            multiple
            className="inputFile w-full text-sm text-gray-600"
            data-post-url="/api/upload/docs"
          />
        </div>
      </div>

      <Field label="Captcha Answer: What is 7 + 5?" required htmlFor="captcha-answer" hint="Enter the numeric result">
        <Input id="captcha-answer" type="number" placeholder="12" ariaDescribedBy="captcha-answer-hint" />
      </Field>

      <Field label="Final Comments" htmlFor="final-comments">
        <Textarea id="final-comments" rows={4}
          placeholder="Any additional feedback, questions, or comments for our team…"
        />
      </Field>

      <Field label="How satisfied are you with this form?" htmlFor="form-rating">
        <Select id="form-rating">
          <option value="">Rate this form…</option>
          <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
          <option value="4">⭐⭐⭐⭐ Good</option>
          <option value="3">⭐⭐⭐ Average</option>
          <option value="2">⭐⭐ Poor</option>
          <option value="1">⭐ Very Poor</option>
        </Select>
      </Field>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <input type="checkbox" id="survey-consent" name="survey-consent" required
            className="mt-0.5 accent-teal-600 w-4 h-4 shrink-0" />
          <label htmlFor="survey-consent" className="text-sm text-gray-700">
            I consent to anonymous processing of my survey responses for product improvement.
          </label>
        </div>
        <div className="flex items-start gap-3">
          <input type="checkbox" id="survey-newsletter" name="survey-newsletter"
            className="mt-0.5 accent-teal-600 w-4 h-4 shrink-0" />
          <label htmlFor="survey-newsletter" className="text-sm text-gray-700">
            Subscribe me to the quarterly product newsletter.
          </label>
        </div>
      </div>

      {/* Submit-type input — should be skipped by extractField */}
      <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-400">
        ⚠ Below is a <code>type=&quot;submit&quot;</code> input — <code>extractField()</code> should skip it:
        <input type="submit" value="Submit Survey" className="hidden" />
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [StepText, StepDateTime, StepSelections, StepRadios, StepCheckboxes, StepFiles];

export default function SurveyPage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Survey Submitted — Thank You!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="Input Type Coverage Survey"
      steps={STEPS}
      currentStep={wizard.step}
      stepComponents={STEP_COMPONENTS}
      onNext={wizard.next}
      onBack={wizard.back}
      onSubmit={() => setDone(true)}
      isFirst={wizard.isFirst}
      isLast={wizard.isLast}
    />
  );
}
