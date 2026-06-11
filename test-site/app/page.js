const forms = [
  {
    href: "/registration",
    title: "5-Step Registration Wizard",
    badge: "Personal · Address · Professional · Account · Review",
    desc: "Tests all standard autocomplete fields: name, email, phone, date-of-birth, address, username, password. Mix of aria-label, for/id, and ancestor-label patterns.",
    color: "indigo",
  },
  {
    href: "/application",
    title: "Job Application Form",
    badge: "5 steps · File upload · Conditional",
    desc: "Work history repeater, multi-select skills (checkboxes), salary range (select), availability date, cover letter (textarea). Tests conditional field visibility.",
    color: "emerald",
  },
  {
    href: "/medical",
    title: "Medical Intake — German Labels",
    badge: "4 steps · Deutsch · aria-describedby",
    desc: "All labels in German (Vorname, Nachname, Geburtsdatum, Postleitzahl…). Tests German keyword matching in matchProfile. Dense aria-describedby hint/error patterns.",
    color: "rose",
  },
  {
    href: "/checkout",
    title: "E-Commerce Checkout",
    badge: "4 steps · Payment · Validation",
    desc: "Cart → Shipping → Payment → Confirmation. autocomplete attributes set explicitly. Tests credit-card field detection and error message extraction.",
    color: "amber",
  },
  {
    href: "/insurance",
    title: "Insurance Application",
    badge: "5 steps · Kendo-style · Conditional",
    desc: "Policy type (data-role select), coverage levels, beneficiary management (dynamic rows), signature checkbox. Tests isKendoWidget and getAgentSelector fallback logic.",
    color: "purple",
  },
  {
    href: "/survey",
    title: "Complex Survey — All Input Types",
    badge: "6 steps · Every input type",
    desc: "Dedicated step per input type: text/email/tel, date/time, select/multi-select, radio groups, checkbox groups, range sliders, file uploads. Exhaustive coverage.",
    color: "teal",
  },
];

const colorMap = {
  indigo: "bg-indigo-50 border-indigo-200 hover:border-indigo-400",
  emerald: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  rose: "bg-rose-50 border-rose-200 hover:border-rose-400",
  amber: "bg-amber-50 border-amber-200 hover:border-amber-400",
  purple: "bg-purple-50 border-purple-200 hover:border-purple-400",
  teal: "bg-teal-50 border-teal-200 hover:border-teal-400",
};

export default function Home() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">FormAssist Test Suite</h1>
        <p className="text-gray-600 max-w-2xl">
          Six deliberately complex multi-step forms covering every field type, label pattern, and edge
          case in the FormAssist extension. Each form has <strong>Next</strong> and <strong>Back</strong> navigation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {forms.map((f) => (
          <a
            key={f.href}
            href={f.href}
            className={`block border-2 rounded-xl p-5 transition-all ${colorMap[f.color]} group`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold group-hover:underline">{f.title}</h2>
              <span className="text-xs bg-white/70 border border-gray-200 rounded-full px-2 py-0.5 whitespace-nowrap shrink-0">
                →
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 mt-1 mb-2">{f.badge}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{f.desc}</p>
          </a>
        ))}
      </div>

      <div className="mt-10 p-5 bg-gray-100 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-2">How to use with FormAssist</h3>
        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
          <li>Load a profile in the extension options (or use Smart Fill with a filled profile).</li>
          <li>Navigate to any form below.</li>
          <li>Press <kbd className="bg-white border border-gray-300 rounded px-1 py-0.5 text-xs font-mono">Alt+Shift+S</kbd> to trigger Smart Fill.</li>
          <li>Use Next/Back to advance through steps; auto-advance should click Next after filling each step.</li>
        </ol>
      </div>
    </div>
  );
}
