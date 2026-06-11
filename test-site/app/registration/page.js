"use client";
import { useState } from "react";
import { useWizard, WizardShell, Field, Input, Select, Textarea, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Personal Info", "Contact", "Address", "Professional", "Review & Account"];

/* ── Step 1: Personal Info ─────────────────────────────────────────── */
function StepPersonal() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: <code>autocomplete</code> attributes, <code>for/id</code> label association, gender radio group.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required htmlFor="first-name">
          <Input id="first-name" autoComplete="given-name" placeholder="e.g. John" />
        </Field>
        <Field label="Last Name" required htmlFor="last-name">
          <Input id="last-name" autoComplete="family-name" placeholder="e.g. Doe" />
        </Field>
      </div>

      <Field label="Middle Name" htmlFor="middle-name" hint="Optional — leave blank if not applicable">
        <Input id="middle-name" autoComplete="additional-name" placeholder="Middle name" ariaDescribedBy="middle-name-hint" />
      </Field>

      <Field label="Date of Birth" required htmlFor="dob">
        <Input id="dob" type="date" autoComplete="bday" />
      </Field>

      <Field label="Gender" required htmlFor="gender-group">
        <div className="flex flex-wrap gap-5 mt-1" id="gender-group" role="radiogroup" aria-labelledby="gender-label">
          <span id="gender-label" className="sr-only">Gender</span>
          {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
            <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="gender" value={g.toLowerCase().replace(/ /g, "-")} className="accent-indigo-600" />
              {g}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Nationality" htmlFor="nationality">
        <Select id="nationality" autoComplete="country">
          <option value="">Select nationality…</option>
          <option value="AT">Austria</option>
          <option value="DE">Germany</option>
          <option value="CH">Switzerland</option>
          <option value="US">United States</option>
          <option value="GB">United Kingdom</option>
          <option value="FR">France</option>
          <option value="IT">Italy</option>
          <option value="OTHER">Other</option>
        </Select>
      </Field>

      <Field label="Preferred Language" htmlFor="language">
        <Select id="language">
          <option value="">Select language…</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
        </Select>
      </Field>
    </div>
  );
}

/* ── Step 2: Contact ────────────────────────────────────────────────── */
function StepContact() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: <code>autocomplete=email/tel</code>, aria-describedby hint/error patterns.
      </p>

      <Field
        label="Email Address"
        required
        htmlFor="email"
        hint="We will send a confirmation to this address"
        error=""
      >
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" ariaDescribedBy="email-hint" />
      </Field>

      <Field label="Confirm Email" required htmlFor="email-confirm">
        <Input id="email-confirm" type="email" autoComplete="email" placeholder="Repeat email address" />
      </Field>

      <Field label="Phone Number" required htmlFor="phone" hint="Include country code, e.g. +43 664 123456">
        <Input id="phone" type="tel" autoComplete="tel" placeholder="+43 664 123456" ariaDescribedBy="phone-hint" />
      </Field>

      <Field label="Mobile / WhatsApp" htmlFor="mobile">
        <Input id="mobile" type="tel" autoComplete="tel-local" placeholder="+43 699 987654" />
      </Field>

      <Field label="Website / LinkedIn" htmlFor="website">
        <Input id="website" type="url" autoComplete="url" placeholder="https://linkedin.com/in/yourname" />
      </Field>

      {/* Deliberately missing <label> — tests placeholder fallback */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ No &lt;label&gt; below — tests placeholder fallback in getLabel()</p>
        <input
          id="twitter-handle"
          name="twitter-handle"
          type="text"
          placeholder="Twitter / X handle"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

/* ── Step 3: Address ────────────────────────────────────────────────── */
function StepAddress() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: full address autocomplete suite, <code>aria-label</code> on inputs without visible label.
      </p>

      <Field label="Street Address" required htmlFor="street-address">
        <Input id="street-address" autoComplete="street-address" placeholder="Hauptstraße 12" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="City" required htmlFor="city">
            <Input id="city" autoComplete="address-level2" placeholder="Vienna" />
          </Field>
        </div>
        <Field label="ZIP / Postal Code" required htmlFor="postal-code">
          <Input id="postal-code" autoComplete="postal-code" placeholder="1010" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="State / Province" htmlFor="state">
          <Input id="state" autoComplete="address-level1" placeholder="Vienna" />
        </Field>
        <Field label="Country" required htmlFor="country">
          <Select id="country" autoComplete="country">
            <option value="">Select country…</option>
            <option value="AT">Austria</option>
            <option value="DE">Germany</option>
            <option value="CH">Switzerland</option>
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
      </div>

      {/* aria-label only, no visible <label> */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ Uses aria-label only — tests aria-label extraction in getLabel()</p>
        <input
          id="apt-suite"
          name="apt-suite"
          type="text"
          aria-label="Apartment or Suite Number"
          placeholder="Apt / Suite / Floor"
          autoComplete="address-line2"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Field label="Billing Address Same as Above?" htmlFor="same-address">
        <div className="flex items-center gap-2 mt-1">
          <input
            id="same-address"
            name="same-address"
            type="checkbox"
            defaultChecked
            className="accent-indigo-600 w-4 h-4"
          />
          <label htmlFor="same-address" className="text-sm text-gray-700">
            Yes, use same address for billing
          </label>
        </div>
      </Field>
    </div>
  );
}

/* ── Step 4: Professional ───────────────────────────────────────────── */
function StepProfessional() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: <code>title</code> attribute fallback, organization fields, select with optgroups.
      </p>

      <Field label="Job Title" htmlFor="job-title" hint="Your current position or role">
        <Input id="job-title" autoComplete="organization-title" placeholder="Software Engineer" ariaDescribedBy="job-title-hint" />
      </Field>

      <Field label="Company / Organization" htmlFor="organization">
        <Input id="organization" autoComplete="organization" placeholder="Acme Inc." />
      </Field>

      <Field label="Industry" htmlFor="industry">
        <Select id="industry">
          <option value="">Select industry…</option>
          <optgroup label="Technology">
            <option value="software">Software / IT</option>
            <option value="hardware">Hardware / Electronics</option>
            <option value="fintech">FinTech</option>
          </optgroup>
          <optgroup label="Finance">
            <option value="banking">Banking</option>
            <option value="insurance">Insurance</option>
            <option value="investment">Investment / Asset Management</option>
          </optgroup>
          <optgroup label="Healthcare">
            <option value="hospital">Hospital / Clinic</option>
            <option value="pharma">Pharmaceuticals</option>
          </optgroup>
          <optgroup label="Other">
            <option value="education">Education</option>
            <option value="retail">Retail / E-commerce</option>
            <option value="other">Other</option>
          </optgroup>
        </Select>
      </Field>

      <Field label="Years of Experience" htmlFor="experience-years">
        <Select id="experience-years">
          <option value="">Select…</option>
          <option value="0-1">Less than 1 year</option>
          <option value="1-3">1–3 years</option>
          <option value="3-5">3–5 years</option>
          <option value="5-10">5–10 years</option>
          <option value="10+">10+ years</option>
        </Select>
      </Field>

      <Field label="Annual Salary Range (EUR)" htmlFor="salary-range">
        <Select id="salary-range">
          <option value="">Prefer not to say</option>
          <option value="under-30k">Under €30,000</option>
          <option value="30-50k">€30,000 – €50,000</option>
          <option value="50-75k">€50,000 – €75,000</option>
          <option value="75-100k">€75,000 – €100,000</option>
          <option value="100k+">€100,000+</option>
        </Select>
      </Field>

      {/* title-attribute fallback test */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ Uses title attribute only — tests title fallback in getLabel()</p>
        <input
          id="linkedin-url"
          name="linkedin-url"
          type="url"
          title="LinkedIn Profile URL"
          placeholder="https://linkedin.com/in/..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}

/* ── Step 5: Review & Account ───────────────────────────────────────── */
function StepAccount() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: <code>autocomplete=username/new-password</code>, ancestor <code>&lt;label&gt;</code> wrapping, terms checkbox.
      </p>

      <Field label="Username" required htmlFor="username">
        <Input id="username" autoComplete="username" placeholder="Choose a username" />
      </Field>

      <Field label="Password" required htmlFor="new-password" hint="Minimum 8 characters, include at least one number">
        <Input id="new-password" type="password" autoComplete="new-password" ariaDescribedBy="new-password-hint" />
      </Field>

      <Field label="Confirm Password" required htmlFor="confirm-password">
        <Input id="confirm-password" type="password" autoComplete="new-password" />
      </Field>

      <Field label="Security Question" htmlFor="security-question">
        <Select id="security-question">
          <option value="">Select a question…</option>
          <option value="pet">What was your first pet&apos;s name?</option>
          <option value="school">What elementary school did you attend?</option>
          <option value="city">In what city were you born?</option>
          <option value="mother">What is your mother&apos;s maiden name?</option>
        </Select>
      </Field>

      <Field label="Security Answer" htmlFor="security-answer">
        <Input id="security-answer" type="text" placeholder="Your answer" />
      </Field>

      {/* Ancestor <label> wrapping pattern */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ Ancestor &lt;label&gt; wrapping — tests ancestor label detection</p>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            id="terms-accept"
            name="terms-accept"
            className="mt-0.5 accent-indigo-600 w-4 h-4 shrink-0"
          />
          <span className="text-sm text-gray-700">
            I agree to the <a href="#" className="text-indigo-600 underline">Terms of Service</a> and{" "}
            <a href="#" className="text-indigo-600 underline">Privacy Policy</a>
          </span>
        </label>
      </div>

      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="marketing-opt-in"
          name="marketing-opt-in"
          className="mt-0.5 accent-indigo-600 w-4 h-4 shrink-0"
        />
        <label htmlFor="marketing-opt-in" className="text-sm text-gray-700">
          Send me product updates and newsletters
        </label>
      </div>

      <Field label="How did you hear about us?" htmlFor="referral-source">
        <Select id="referral-source">
          <option value="">Select…</option>
          <option value="search">Search engine</option>
          <option value="social">Social media</option>
          <option value="friend">Friend/colleague</option>
          <option value="ad">Online advertisement</option>
          <option value="event">Conference/event</option>
        </Select>
      </Field>
    </div>
  );
}

const STEP_COMPONENTS = [StepPersonal, StepContact, StepAddress, StepProfessional, StepAccount];

export default function RegistrationPage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Registration Complete!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="5-Step Registration Wizard"
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
