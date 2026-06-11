"use client";
import { useState } from "react";
import { useWizard, WizardShell, Field, Input, Select, Textarea, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Personal Info", "Work History", "Education & Skills", "Availability", "Documents & Submit"];

/* ── Step 1: Personal Info ─────────────────────────────────────────── */
function StepPersonal() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: standard name/email/phone autocomplete, honorific prefix.
      </p>

      <Field label="Honorific / Title" htmlFor="honorific-prefix">
        <Select id="honorific-prefix" autoComplete="honorific-prefix">
          <option value="">—</option>
          <option value="Mr.">Mr.</option>
          <option value="Ms.">Ms.</option>
          <option value="Dr.">Dr.</option>
          <option value="Prof.">Prof.</option>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required htmlFor="given-name">
          <Input id="given-name" autoComplete="given-name" placeholder="Jane" />
        </Field>
        <Field label="Last Name" required htmlFor="family-name">
          <Input id="family-name" autoComplete="family-name" placeholder="Smith" />
        </Field>
      </div>

      <Field label="Email" required htmlFor="email">
        <Input id="email" type="email" autoComplete="email" placeholder="jane@example.com" />
      </Field>

      <Field label="Phone" required htmlFor="tel">
        <Input id="tel" type="tel" autoComplete="tel" placeholder="+1 555 000 0000" />
      </Field>

      <Field label="Position Applied For" required htmlFor="position">
        <Select id="position">
          <option value="">Select role…</option>
          <option value="swe">Software Engineer</option>
          <option value="pm">Product Manager</option>
          <option value="ds">Data Scientist</option>
          <option value="design">UX Designer</option>
          <option value="devops">DevOps / Platform Engineer</option>
          <option value="other">Other</option>
        </Select>
      </Field>

      <Field label="How did you find this listing?" htmlFor="job-source">
        <Select id="job-source">
          <option value="">Select…</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="company">Company website</option>
          <option value="referral">Employee referral</option>
          <option value="other">Other job board</option>
        </Select>
      </Field>
    </div>
  );
}

/* ── Step 2: Work History ───────────────────────────────────────────── */
function StepWorkHistory() {
  const [jobs, setJobs] = useState([{ id: 1 }]);
  const addJob = () => setJobs((j) => [...j, { id: Date.now() }]);
  const removeJob = (id) => setJobs((j) => j.filter((x) => x.id !== id));

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: dynamic form rows (repeater), conditional currently-employed checkbox.
      </p>

      {jobs.map((job, idx) => (
        <div key={job.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Position {idx + 1}</h3>
            {idx > 0 && (
              <button
                type="button"
                onClick={() => removeJob(job.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name" htmlFor={`company-${job.id}`}>
              <Input id={`company-${job.id}`} placeholder="Acme Corp" autoComplete="organization" />
            </Field>
            <Field label="Job Title" htmlFor={`title-${job.id}`}>
              <Input id={`title-${job.id}`} placeholder="Senior Developer" autoComplete="organization-title" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" htmlFor={`start-${job.id}`}>
              <Input id={`start-${job.id}`} type="month" />
            </Field>
            <Field label="End Date" htmlFor={`end-${job.id}`}>
              <Input id={`end-${job.id}`} type="month" placeholder="Leave blank if current" />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id={`current-${job.id}`} name={`current-${job.id}`} className="accent-indigo-600" />
            <label htmlFor={`current-${job.id}`} className="text-sm text-gray-700">
              I currently work here
            </label>
          </div>

          <Field label="Key Responsibilities" htmlFor={`responsibilities-${job.id}`}>
            <Textarea id={`responsibilities-${job.id}`} rows={3} placeholder="Describe your main responsibilities…" />
          </Field>
        </div>
      ))}

      <button
        type="button"
        onClick={addJob}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition"
      >
        + Add Another Position
      </button>
    </div>
  );
}

/* ── Step 3: Education & Skills ─────────────────────────────────────── */
const SKILLS = [
  "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js",
  "Python", "Java", "Go", "Rust", "C#", "SQL", "NoSQL",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "CI/CD", "Git",
];

function StepSkills() {
  const [checked, setChecked] = useState({});
  const toggle = (s) => setChecked((c) => ({ ...c, [s]: !c[s] }));

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: checkbox group extraction, education select, IELTS/cert input.
      </p>

      <Field label="Highest Education Level" required htmlFor="education-level">
        <Select id="education-level">
          <option value="">Select…</option>
          <option value="high-school">High School / Matura</option>
          <option value="bachelor">Bachelor&apos;s Degree</option>
          <option value="master">Master&apos;s Degree</option>
          <option value="phd">PhD / Doctorate</option>
          <option value="vocational">Vocational Training</option>
          <option value="bootcamp">Coding Bootcamp / Certificate</option>
        </Select>
      </Field>

      <Field label="Field of Study" htmlFor="field-of-study">
        <Input id="field-of-study" placeholder="Computer Science, Business, etc." />
      </Field>

      <Field label="University / Institution" htmlFor="university">
        <Input id="university" placeholder="University of Vienna" autoComplete="organization" />
      </Field>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Technical Skills <span className="text-gray-400 font-normal">(select all that apply)</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SKILLS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name="skills"
                value={s.toLowerCase()}
                checked={!!checked[s]}
                onChange={() => toggle(s)}
                className="accent-indigo-600"
              />
              {s}
            </label>
          ))}
        </div>
      </div>

      <Field label="Certifications (comma-separated)" htmlFor="certifications">
        <Input id="certifications" placeholder="AWS Solutions Architect, CKA, PMP…" />
      </Field>

      <Field label="Languages Spoken" htmlFor="languages-spoken">
        <Input id="languages-spoken" placeholder="English (native), German (B2), French (A2)" />
      </Field>
    </div>
  );
}

/* ── Step 4: Availability ───────────────────────────────────────────── */
function StepAvailability() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: date field, radio group, salary expectation input, notice period select.
      </p>

      <Field label="Available From" required htmlFor="available-from">
        <Input id="available-from" type="date" />
      </Field>

      <Field label="Notice Period" htmlFor="notice-period">
        <Select id="notice-period">
          <option value="">Select…</option>
          <option value="immediately">Immediately</option>
          <option value="2-weeks">2 weeks</option>
          <option value="1-month">1 month</option>
          <option value="3-months">3 months</option>
        </Select>
      </Field>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Preferred Work Arrangement</p>
        <div className="flex flex-wrap gap-5">
          {["On-site", "Remote", "Hybrid"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="work-arrangement" value={opt.toLowerCase()} className="accent-indigo-600" />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Employment Type</p>
        <div className="flex flex-wrap gap-5">
          {["Full-time", "Part-time", "Contract", "Freelance"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" name="employment-type" value={opt.toLowerCase()} className="accent-indigo-600" />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <Field label="Salary Expectation (EUR/year)" htmlFor="salary-expectation" hint="Gross annual salary in euros">
        <Input id="salary-expectation" type="number" placeholder="65000" ariaDescribedBy="salary-expectation-hint" />
      </Field>

      <Field label="Willing to Relocate?" htmlFor="relocation">
        <div className="flex items-center gap-2 mt-1">
          <input type="checkbox" id="relocation" name="relocation" className="accent-indigo-600 w-4 h-4" />
          <label htmlFor="relocation" className="text-sm text-gray-700">Yes, I am open to relocation</label>
        </div>
      </Field>
    </div>
  );
}

/* ── Step 5: Documents & Submit ─────────────────────────────────────── */
function StepDocuments() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        Tests: file upload detection (<code>.inputFile</code> class + <code>data-post-url</code>), textarea, final consent.
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          CV / Résumé <span className="text-red-500">*</span>
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition">
          <input
            id="cv-upload"
            name="cv-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            className="inputFile w-full text-sm text-gray-600"
            data-post-url="/api/upload/cv"
          />
          <p className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX — max 5 MB</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter (optional)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-indigo-400 transition">
          <input
            id="cover-letter-upload"
            name="cover-letter-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            className="inputFile w-full text-sm text-gray-600"
            data-post-url="/api/upload/cover"
          />
        </div>
      </div>

      <Field label="Cover Letter Text (alternative to file)" htmlFor="cover-letter-text">
        <Textarea
          id="cover-letter-text"
          rows={6}
          placeholder="Write your cover letter here if not uploading a file…"
        />
      </Field>

      <Field label="Referees (name, company, email — one per line)" htmlFor="referees">
        <Textarea id="referees" rows={4} placeholder={"John Doe, Acme Inc., john@acme.com\nJane Smith, Beta Corp., jane@beta.com"} />
      </Field>

      <div className="flex items-start gap-3 mt-2">
        <input type="checkbox" id="app-consent" name="app-consent" className="mt-0.5 accent-indigo-600 w-4 h-4 shrink-0" required />
        <label htmlFor="app-consent" className="text-sm text-gray-700">
          I confirm all information provided is accurate and I consent to background checks if required.
        </label>
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [StepPersonal, StepWorkHistory, StepSkills, StepAvailability, StepDocuments];

export default function ApplicationPage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Application Submitted!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="Job Application Form"
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
