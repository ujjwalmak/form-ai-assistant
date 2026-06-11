"use client";
import { useState } from "react";
import { useWizard, WizardShell, Field, Input, Select, Textarea, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Policy Type", "Applicant Details", "Coverage & Beneficiaries", "Health Declaration", "Review & Sign"];

/* ── Kendo-style select helper ──────────────────────────────────────── */
function KendoSelect({ id, label, children, hint, required }) {
  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {hint && <p id={`${id}-hint`} className="text-xs text-gray-500 mb-1">{hint}</p>}
      <div className="relative">
        {/* data-role mimics Kendo widget detection */}
        <select
          id={id}
          name={id}
          data-role="dropdownlist"
          required={required || undefined}
          aria-required={required ? "true" : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white pr-8 appearance-none"
        >
          {children}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▾</span>
      </div>
    </div>
  );
}

/* ── Step 1: Policy Type ────────────────────────────────────────────── */
function StepPolicy() {
  const [type, setType] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
        Tests: <code>data-role=&quot;dropdownlist&quot;</code> Kendo-style widget detection via <code>isKendoWidget()</code>.
      </p>

      <KendoSelect id="policy-type" label="Insurance Policy Type" required hint="Select the type of insurance you wish to apply for">
        <option value="">Select policy…</option>
        <optgroup label="Life Insurance">
          <option value="term-life">Term Life</option>
          <option value="whole-life">Whole Life</option>
          <option value="universal-life">Universal Life</option>
        </optgroup>
        <optgroup label="Health Insurance">
          <option value="individual-health">Individual Health</option>
          <option value="family-health">Family Health</option>
          <option value="supplemental">Supplemental Coverage</option>
        </optgroup>
        <optgroup label="Property">
          <option value="home-owner">Homeowner</option>
          <option value="renter">Renter</option>
          <option value="auto">Auto / Vehicle</option>
        </optgroup>
      </KendoSelect>

      <KendoSelect id="coverage-level" label="Coverage Level">
        <option value="">Select level…</option>
        <option value="basic">Basic (€50,000)</option>
        <option value="standard">Standard (€150,000)</option>
        <option value="premium">Premium (€500,000)</option>
        <option value="elite">Elite (€1,000,000+)</option>
      </KendoSelect>

      <KendoSelect id="payment-frequency" label="Premium Payment Frequency">
        <option value="">Select…</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="semi-annual">Semi-Annual</option>
        <option value="annual">Annual</option>
      </KendoSelect>

      <Field label="Desired Start Date" required htmlFor="policy-start">
        <Input id="policy-start" type="date" />
      </Field>

      <Field label="Policy Duration (years)" htmlFor="policy-duration">
        <Select id="policy-duration">
          <option value="">Select…</option>
          {[5, 10, 15, 20, 25, 30].map(y => <option key={y} value={y}>{y} years</option>)}
          <option value="lifetime">Lifetime / Permanent</option>
        </Select>
      </Field>

      <Field label="Promotional Code" htmlFor="promo-code">
        <Input id="promo-code" placeholder="Enter promo or agent code" />
      </Field>
    </div>
  );
}

/* ── Step 2: Applicant Details ──────────────────────────────────────── */
function StepApplicant() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
        Tests: <code>getAgentSelector()</code> fallback — elements with neither id nor name get incremental <code>data-fa-selector-id</code>.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required htmlFor="applicant-first-name">
          <Input id="applicant-first-name" autoComplete="given-name" />
        </Field>
        <Field label="Last Name" required htmlFor="applicant-last-name">
          <Input id="applicant-last-name" autoComplete="family-name" />
        </Field>
      </div>

      <Field label="Date of Birth" required htmlFor="applicant-dob">
        <Input id="applicant-dob" type="date" autoComplete="bday" />
      </Field>

      {/* No id or name — tests data-fa-selector-id incremental assignment */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ No id or name — tests <code>getAgentSelector()</code> fallback to <code>data-fa-selector-id</code></p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
        <input
          type="text"
          placeholder="City and country of birth"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <Field label="National ID / Passport Number" required htmlFor="national-id">
        <Input id="national-id" placeholder="e.g. P1234567 or 1234567890" />
      </Field>

      <Field label="Tax Identification Number" htmlFor="tax-id">
        <Input id="tax-id" placeholder="TIN / UID" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Email" required htmlFor="ins-email">
          <Input id="ins-email" type="email" autoComplete="email" />
        </Field>
        <Field label="Phone" required htmlFor="ins-phone">
          <Input id="ins-phone" type="tel" autoComplete="tel" />
        </Field>
      </div>

      <Field label="Occupation" required htmlFor="ins-occupation">
        <Input id="ins-occupation" autoComplete="organization-title" placeholder="Current job title" />
      </Field>

      <KendoSelect id="annual-income" label="Annual Gross Income">
        <option value="">Select range…</option>
        <option value="under-20k">Under €20,000</option>
        <option value="20-40k">€20,000 – €40,000</option>
        <option value="40-70k">€40,000 – €70,000</option>
        <option value="70-120k">€70,000 – €120,000</option>
        <option value="120k+">Over €120,000</option>
      </KendoSelect>
    </div>
  );
}

/* ── Step 3: Coverage & Beneficiaries ───────────────────────────────── */
function StepBeneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([{ id: 1 }]);
  const add = () => setBeneficiaries((b) => [...b, { id: Date.now() }]);
  const remove = (id) => setBeneficiaries((b) => b.filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
        Tests: dynamic beneficiary rows, percentage inputs, relationship selects.
      </p>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
        Total beneficiary percentages must equal 100%.
      </div>

      {beneficiaries.map((b, idx) => (
        <div key={b.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Beneficiary {idx + 1}</h3>
            {idx > 0 && (
              <button type="button" onClick={() => remove(b.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" htmlFor={`ben-name-${b.id}`}>
              <Input id={`ben-name-${b.id}`} placeholder="Beneficiary full name" autoComplete="name" />
            </Field>
            <Field label="Relationship" htmlFor={`ben-rel-${b.id}`}>
              <Select id={`ben-rel-${b.id}`}>
                <option value="">Select…</option>
                <option value="spouse">Spouse / Partner</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="trust">Trust / Estate</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of Birth" htmlFor={`ben-dob-${b.id}`}>
              <Input id={`ben-dob-${b.id}`} type="date" autoComplete="bday" />
            </Field>
            <Field label="Share (%)" required htmlFor={`ben-pct-${b.id}`}>
              <Input id={`ben-pct-${b.id}`} type="number" min="1" max="100" placeholder="e.g. 50" />
            </Field>
          </div>

          <Field label="ID / Passport Number" htmlFor={`ben-id-${b.id}`}>
            <Input id={`ben-id-${b.id}`} placeholder="National ID or passport" />
          </Field>
        </div>
      ))}

      <button type="button" onClick={add}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-purple-400 hover:text-purple-600 transition">
        + Add Beneficiary
      </button>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Contingent Beneficiary" htmlFor="contingent-ben">
          <Input id="contingent-ben" placeholder="Name of contingent beneficiary" />
        </Field>
        <Field label="Contingent Relationship" htmlFor="contingent-rel">
          <Select id="contingent-rel">
            <option value="">Select…</option>
            <option value="estate">Estate</option>
            <option value="trust">Trust</option>
            <option value="charity">Charitable Organization</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}

/* ── Step 4: Health Declaration ─────────────────────────────────────── */
const HEALTH_QUESTIONS = [
  { id: "hq-1", q: "Have you been diagnosed with cancer or a tumor in the past 5 years?" },
  { id: "hq-2", q: "Do you have or have you had a heart condition, stroke, or cardiovascular disease?" },
  { id: "hq-3", q: "Are you currently taking prescription medication on an ongoing basis?" },
  { id: "hq-4", q: "Have you been hospitalized for more than 3 consecutive days in the past 2 years?" },
  { id: "hq-5", q: "Do you participate in any extreme or high-risk sports activities?" },
  { id: "hq-6", q: "Do you have a history of mental health treatment or substance use disorder?" },
];

function StepHealth() {
  const [answers, setAnswers] = useState({});
  const set = (id, val) => setAnswers((a) => ({ ...a, [id]: val }));

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
        Tests: Yes/No radio groups, conditional textarea reveal, nested Kendo dropdown.
      </p>

      {HEALTH_QUESTIONS.map(({ id, q }) => (
        <div key={id} className="border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-800 mb-3">{q}</p>
          <div className="flex gap-6">
            {["Yes", "No"].map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name={id}
                  value={opt.toLowerCase()}
                  checked={answers[id] === opt.toLowerCase()}
                  onChange={() => set(id, opt.toLowerCase())}
                  className="accent-purple-600"
                />
                {opt}
              </label>
            ))}
          </div>
          {answers[id] === "yes" && (
            <div className="mt-3">
              <label htmlFor={`${id}-details`} className="block text-xs font-medium text-gray-600 mb-1">
                Please provide details:
              </label>
              <textarea
                id={`${id}-details`}
                name={`${id}-details`}
                rows={2}
                placeholder="Describe diagnosis, treatment, dates, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
              />
            </div>
          )}
        </div>
      ))}

      <Field label="Height (cm)" htmlFor="applicant-height">
        <Input id="applicant-height" type="number" placeholder="175" />
      </Field>

      <Field label="Weight (kg)" htmlFor="applicant-weight">
        <Input id="applicant-weight" type="number" placeholder="70" />
      </Field>

      <KendoSelect id="smoker-status" label="Smoking Status">
        <option value="">Select…</option>
        <option value="never">Never smoked</option>
        <option value="former">Former smoker (quit over 2 years ago)</option>
        <option value="recent-quit">Recent quitter (under 2 years)</option>
        <option value="current">Current smoker</option>
      </KendoSelect>
    </div>
  );
}

/* ── Step 5: Review & Sign ──────────────────────────────────────────── */
function StepSign() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-purple-50 rounded-lg p-3">
        Tests: signature text field, date field, final consent checkboxes.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
        <h3 className="font-semibold text-gray-900 mb-2">Declaration</h3>
        <p className="leading-relaxed">
          I declare that all information provided in this application is true and complete to the best of my
          knowledge. I understand that any misrepresentation may result in the policy being voided. I authorize
          the insurer to obtain medical and financial information as required for underwriting purposes.
        </p>
      </div>

      <Field label="Electronic Signature (Full Legal Name)" required htmlFor="signature">
        <Input id="signature" placeholder="Type your full legal name" autoComplete="name" />
      </Field>

      <Field label="Date of Signature" required htmlFor="signature-date">
        <Input id="signature-date" type="date" autoComplete="bday" />
      </Field>

      <Field label="Agent / Broker Code (if applicable)" htmlFor="agent-code">
        <Input id="agent-code" placeholder="Agent code" />
      </Field>

      <div className="space-y-3">
        {[
          { id: "sig-accuracy", label: "I confirm the accuracy of all information provided." },
          { id: "sig-terms", label: "I have read and agree to the Policy Terms and Conditions." },
          { id: "sig-privacy", label: "I consent to the processing of my personal and health data for insurance purposes." },
        ].map(({ id, label }) => (
          <div key={id} className="flex items-start gap-3">
            <input type="checkbox" id={id} name={id} required
              className="mt-0.5 accent-purple-600 w-4 h-4 shrink-0" />
            <label htmlFor={id} className="text-sm text-gray-700">{label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [StepPolicy, StepApplicant, StepBeneficiaries, StepHealth, StepSign];

export default function InsurancePage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Insurance Application Submitted!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="Insurance Application"
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
