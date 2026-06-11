"use client";
import React, { useState, useRef } from "react";

export function useWizard(total) {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const isFirst = step === 0;
  const isLast = step === total - 1;
  return { step, next, back, isFirst, isLast, setStep };
}

/* Validate all required form controls inside a step container.
   Returns the first invalid element, or null if everything is filled. */
function validateContainer(container) {
  if (!container) return null;
  let firstInvalid = null;
  const seenRadioGroups = {};

  const fields = container.querySelectorAll(
    "input[required], select[required], textarea[required]"
  );

  fields.forEach((el) => {
    let empty;
    if (el.type === "checkbox") {
      empty = !el.checked;
    } else if (el.type === "radio") {
      if (seenRadioGroups[el.name]) return;
      seenRadioGroups[el.name] = true;
      empty = !container.querySelector(`input[name="${el.name}"]:checked`);
    } else {
      empty = !el.value || !String(el.value).trim();
    }

    if (empty) {
      el.classList.add("fa-invalid");
      el.setAttribute("aria-invalid", "true");
      if (!firstInvalid) firstInvalid = el;
    } else {
      el.classList.remove("fa-invalid");
      el.setAttribute("aria-invalid", "false");
    }
  });

  return firstInvalid;
}

export function WizardShell({
  title,
  steps,
  currentStep,
  stepComponents,
  onNext,
  onBack,
  onSubmit,
  isFirst,
  isLast,
}) {
  const stepRefs = useRef([]);
  const [error, setError] = useState("");

  const guard = (proceed) => {
    const firstInvalid = validateContainer(stepRefs.current[currentStep]);
    if (firstInvalid) {
      setError("Bitte füllen Sie alle Pflichtfelder aus. — Please complete all required fields.");
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    proceed();
  };

  const handleBack = () => {
    setError("");
    onBack();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-6 mt-4">
        {steps.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-2 w-full rounded-full transition-all duration-300 ${
                i <= currentStep ? "bg-indigo-600" : "bg-gray-200"
              }`}
            />
            <span
              className={`text-[10px] font-medium hidden sm:block ${
                i === currentStep ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              {s}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">
            Step {currentStep + 1} of {steps.length} — {steps[currentStep]}
          </h2>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            <span className="text-red-500">*</span> Pflichtfeld / required
          </span>
        </div>

        {/* All steps stay mounted; only the active one is shown so that
            field values (and dynamic rows) survive Back/Next navigation. */}
        {stepComponents.map((Comp, i) => (
          <div key={i} ref={(el) => (stepRefs.current[i] = el)} hidden={i !== currentStep}>
            <Comp />
          </div>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
        >
          <span>⚠</span> {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-5">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst}
          className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium
            hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          ← Back
        </button>

        {isLast ? (
          <button
            type="button"
            id="form-submit-btn"
            data-testid="submit-btn"
            onClick={() => guard(onSubmit)}
            className="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition"
          >
            Submit Form ✓
          </button>
        ) : (
          <button
            type="button"
            id="form-next-btn"
            data-testid="next-btn"
            onClick={() => guard(onNext)}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

/* A labelled form field. When `required` is set, the asterisk is shown AND
   the `required` attribute is injected onto the inner control so that the
   wizard's validation can enforce it. */
export function Field({ label, required, hint, error, htmlFor, children, ariaLabelledBy, noLabel }) {
  const id = htmlFor;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  let control = children;
  if (
    required &&
    React.isValidElement(children) &&
    (children.type === Input || children.type === Select || children.type === Textarea)
  ) {
    control = React.cloneElement(children, { required: true, "aria-required": "true" });
  }

  return (
    <div className="mb-4">
      {!noLabel && (
        <label
          htmlFor={id}
          id={ariaLabelledBy || undefined}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-gray-500 mb-1">
          {hint}
        </p>
      )}
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

export function Input({ id, type = "text", placeholder, autoComplete, ariaDescribedBy, className = "", ...rest }) {
  return (
    <input
      id={id}
      name={id}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      aria-describedby={ariaDescribedBy}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${className}`}
      {...rest}
    />
  );
}

export function Select({ id, autoComplete, ariaDescribedBy, children, className = "", ...rest }) {
  return (
    <select
      id={id}
      name={id}
      autoComplete={autoComplete}
      aria-describedby={ariaDescribedBy}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ id, placeholder, ariaDescribedBy, rows = 4, className = "", ...rest }) {
  return (
    <textarea
      id={id}
      name={id}
      placeholder={placeholder}
      aria-describedby={ariaDescribedBy}
      rows={rows}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y ${className}`}
      {...rest}
    />
  );
}

export function SuccessScreen({ title, onReset }) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-green-600 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">Form submitted successfully. FormAssist test complete.</p>
      <button
        onClick={onReset}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
      >
        Reset &amp; Test Again
      </button>
    </div>
  );
}
