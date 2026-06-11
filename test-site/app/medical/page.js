"use client";
import React, { useState } from "react";
import { useWizard, WizardShell, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Persönliche Daten", "Anamnese", "Krankengeschichte", "Einwilligung"];

/* ─── German Field helpers ──────────────────────────────────────────── */
function GField({ label, required, hint, error, htmlFor, children }) {
  const hintId = hint ? `${htmlFor}-hinweis` : undefined;
  const errorId = error ? `${htmlFor}-fehler` : undefined;
  let control = children;
  if (
    required &&
    React.isValidElement(children) &&
    (children.type === GInput || children.type === GSelect)
  ) {
    control = React.cloneElement(children, { required: true, "aria-required": "true" });
  }
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {hint && <p id={hintId} className="text-xs text-gray-500 mb-1">{hint}</p>}
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 mt-1">⚠ {error}</p>
      )}
    </div>
  );
}

function GInput({ id, type = "text", placeholder, autoComplete, ariaDescribedBy, ...rest }) {
  return (
    <input
      id={id} name={id} type={type}
      placeholder={placeholder} autoComplete={autoComplete}
      aria-describedby={ariaDescribedBy}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
      {...rest}
    />
  );
}

function GSelect({ id, autoComplete, children, ...rest }) {
  return (
    <select
      id={id} name={id} autoComplete={autoComplete}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
      {...rest}
    >
      {children}
    </select>
  );
}

/* ── Schritt 1: Persönliche Daten ───────────────────────────────────── */
function Schritt1() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-rose-50 rounded-lg p-3">
        Testet: deutsche Schlüsselwörter (<code>vorname</code>, <code>nachname</code>, <code>geburtsdatum</code>, <code>postleitzahl</code>) in <code>matchProfile()</code>.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <GField label="Vorname" required htmlFor="vorname">
          <GInput id="vorname" autoComplete="given-name" placeholder="z.B. Maria" />
        </GField>
        <GField label="Nachname" required htmlFor="nachname">
          <GInput id="nachname" autoComplete="family-name" placeholder="z.B. Muster" />
        </GField>
      </div>

      <GField label="Geburtsdatum" required htmlFor="geburtsdatum" hint="Format: TT.MM.JJJJ">
        <GInput id="geburtsdatum" type="date" autoComplete="bday" ariaDescribedBy="geburtsdatum-hinweis" />
      </GField>

      <GField label="Geschlecht" required htmlFor="geschlecht">
        <GSelect id="geschlecht">
          <option value="">Bitte wählen…</option>
          <option value="weiblich">Weiblich</option>
          <option value="maennlich">Männlich</option>
          <option value="divers">Divers</option>
          <option value="keine-angabe">Keine Angabe</option>
        </GSelect>
      </GField>

      <GField label="Sozialversicherungsnummer" htmlFor="svnr" hint="10-stellige Sozialversicherungsnummer">
        <GInput id="svnr" placeholder="1234 010180" ariaDescribedBy="svnr-hinweis" />
      </GField>

      {/* aria-labelledby test: label element separate from input */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 italic mb-1">⚠ Nutzt <code>aria-labelledby</code> — testet Multi-ID Auflösung in <code>getLabel()</code></p>
        <span id="vers-label-1">Krankenkasse</span>
        <span id="vers-label-2"> / Versicherungsträger</span>
        <GInput
          id="krankenkasse"
          aria-labelledby="vers-label-1 vers-label-2"
          placeholder="z.B. ÖGK, BVAEB, SVS"
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <GField label="Versicherungsnummer" htmlFor="versicherungsnummer">
        <GInput id="versicherungsnummer" placeholder="Versicherungsnummer eingeben" />
      </GField>
    </div>
  );
}

/* ── Schritt 2: Adresse & Kontakt ───────────────────────────────────── */
function Schritt2() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-rose-50 rounded-lg p-3">
        Testet: <code>strasse</code>, <code>hausnummer</code>, <code>postleitzahl</code>, <code>ort</code> — deutsche Adressfelder.
      </p>

      <GField label="Straße" required htmlFor="strasse">
        <GInput id="strasse" autoComplete="address-line1" placeholder="Mariahilfer Straße" />
      </GField>

      <div className="grid grid-cols-3 gap-3">
        <GField label="Hausnummer" required htmlFor="hausnummer">
          <GInput id="hausnummer" placeholder="12" />
        </GField>
        <GField label="Stiege / Top" htmlFor="stiege-top">
          <GInput id="stiege-top" placeholder="1/15" autoComplete="address-line2" />
        </GField>
        <GField label="Postleitzahl" required htmlFor="postleitzahl">
          <GInput id="postleitzahl" autoComplete="postal-code" placeholder="1060" />
        </GField>
      </div>

      <GField label="Ort / Gemeinde" required htmlFor="ort">
        <GInput id="ort" autoComplete="address-level2" placeholder="Wien" />
      </GField>

      <GField label="Bundesland" htmlFor="bundesland">
        <GSelect id="bundesland" autoComplete="address-level1">
          <option value="">Bitte wählen…</option>
          {["Wien","Niederösterreich","Oberösterreich","Steiermark","Tirol","Kärnten","Salzburg","Vorarlberg","Burgenland"].map(b => (
            <option key={b} value={b.toLowerCase()}>{b}</option>
          ))}
        </GSelect>
      </GField>

      <GField label="Telefon" htmlFor="telefon">
        <GInput id="telefon" type="tel" autoComplete="tel" placeholder="+43 1 234 5678" />
      </GField>

      <GField label="E-Mail-Adresse" htmlFor="email-de">
        <GInput id="email-de" type="email" autoComplete="email" placeholder="maria.muster@beispiel.at" />
      </GField>
    </div>
  );
}

/* ── Schritt 3: Krankengeschichte ───────────────────────────────────── */
const ERKRANKUNGEN = [
  "Diabetes mellitus Typ 1", "Diabetes mellitus Typ 2",
  "Bluthochdruck (Hypertonie)", "Herzerkrankung",
  "Asthma / COPD", "Schilddrüsenerkrankung",
  "Nierenerkrankung", "Lebererkrankung",
  "Krebserkrankung (aktiv oder vergangen)", "Epilepsie",
  "Depression / Angststörung", "Autoimmunerkrankung",
];

const ALLERGIEN = [
  "Penicillin", "ASS / Aspirin", "Ibuprofen",
  "Sulfonamide", "Latex", "Jod", "Nüsse", "Gluten",
];

function Schritt3() {
  const [checked, setChecked] = useState({});
  const [allergien, setAllergien] = useState({});
  const toggle = (s, setter) => setter((c) => ({ ...c, [s]: !c[s] }));

  return (
    <div className="space-y-5">
      <p className="text-xs text-gray-500 bg-rose-50 rounded-lg p-3">
        Testet: <code>aria-describedby</code> mit Fehler-/Hinweistext, Checkbox-Gruppen, bedingte Felder.
      </p>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Vorerkrankungen (Mehrfachauswahl möglich)</p>
        <div className="grid grid-cols-2 gap-2">
          {ERKRANKUNGEN.map((e) => (
            <label key={e} className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="erkrankungen" value={e} checked={!!checked[e]}
                onChange={() => toggle(e, setChecked)} className="mt-0.5 accent-rose-500" />
              {e}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Bekannte Allergien / Unverträglichkeiten</p>
        <div className="grid grid-cols-2 gap-2">
          {ALLERGIEN.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="allergien" value={a} checked={!!allergien[a]}
                onChange={() => toggle(a, setAllergien)} className="accent-rose-500" />
              {a}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="weitere-allergien" className="block text-sm font-medium text-gray-700 mb-1">
          Sonstige Allergien / Unverträglichkeiten
        </label>
        <p id="weitere-allergien-hinweis" className="text-xs text-gray-500 mb-1">Bitte kommagetrennt angeben</p>
        <input id="weitere-allergien" name="weitere-allergien"
          type="text" aria-describedby="weitere-allergien-hinweis"
          placeholder="z.B. Bienengift, Hausstaub"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="medikamente" className="block text-sm font-medium text-gray-700 mb-1">
          Aktuelle Medikamente
        </label>
        <p id="medikamente-hinweis" className="text-xs text-gray-500 mb-1">
          Name, Dosis und Häufigkeit angeben (ein Eintrag pro Zeile)
        </p>
        <textarea id="medikamente" name="medikamente" rows={4}
          aria-describedby="medikamente-hinweis"
          placeholder={"Metformin 500mg, 2x täglich\nRamipril 5mg, 1x morgens"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-y"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="operationen" className="block text-sm font-medium text-gray-700 mb-1">
          Frühere Operationen / Eingriffe
        </label>
        <textarea id="operationen" name="operationen" rows={3}
          placeholder="Art des Eingriffs und Jahr…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-y"
        />
      </div>

      <GField label="Raucherstatus" htmlFor="raucherstatus">
        <GSelect id="raucherstatus">
          <option value="">Bitte wählen…</option>
          <option value="nein">Nichtraucher</option>
          <option value="ex">Exraucher</option>
          <option value="gelegentlich">Gelegentlicher Raucher</option>
          <option value="regelmaessig">Regelmäßiger Raucher</option>
        </GSelect>
      </GField>
    </div>
  );
}

/* ── Schritt 4: Einwilligung ────────────────────────────────────────── */
function Schritt4() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-rose-50 rounded-lg p-3">
        Testet: verschachtelte <code>[role=&quot;alert&quot;]</code> Fehlercontainer, Pflichtfelder-Checkboxen.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed mb-4">
        <h3 className="font-semibold text-gray-900 mb-2">Datenschutzerklärung</h3>
        <p>
          Ihre Gesundheitsdaten werden gemäß der DSGVO und dem österreichischen Gesundheitstelematikgesetz verarbeitet.
          Die Daten werden ausschließlich für Behandlungszwecke verwendet und nicht an Dritte weitergegeben.
          Sie haben jederzeit das Recht auf Auskunft, Berichtigung und Löschung Ihrer Daten.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { id: "einwilligung-behandlung", label: "Ich stimme der Speicherung meiner Gesundheitsdaten für Behandlungszwecke zu.", required: true },
          { id: "einwilligung-weitergabe", label: "Ich bin einverstanden, dass meine Daten bei medizinischer Notwendigkeit an andere Behandler weitergegeben werden.", required: true },
          { id: "einwilligung-forschung", label: "Ich erkläre mein freiwilliges Einverständnis zur anonymisierten Nutzung meiner Daten für medizinische Forschungszwecke.", required: false },
          { id: "einwilligung-newsletter", label: "Ich möchte Gesundheitstipps und Erinnerungen per E-Mail erhalten.", required: false },
        ].map(({ id, label, required }) => (
          <div key={id} className="flex items-start gap-3">
            <input type="checkbox" id={id} name={id}
              className="mt-0.5 accent-rose-500 w-4 h-4 shrink-0" required={required} />
            <label htmlFor={id} className="text-sm text-gray-700">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label htmlFor="unterschrift-name" className="block text-sm font-medium text-gray-700 mb-1">
          Vor- und Nachname (als elektronische Unterschrift) <span className="text-red-500">*</span>
        </label>
        <div role="alert" id="unterschrift-fehler" className="text-xs text-red-600 mb-1 hidden">
          Bitte geben Sie Ihren vollständigen Namen ein.
        </div>
        <input id="unterschrift-name" name="unterschrift-name" type="text"
          aria-describedby="unterschrift-fehler"
          placeholder="Maria Muster"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="datum-einwilligung" className="block text-sm font-medium text-gray-700 mb-1">
          Datum <span className="text-red-500">*</span>
        </label>
        <input id="datum-einwilligung" name="datum-einwilligung" type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
        />
      </div>
    </div>
  );
}

const STEP_COMPONENTS = [Schritt1, Schritt2, Schritt3, Schritt4];

export default function MedicalPage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Formular erfolgreich eingereicht!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="Medizinisches Aufnahmeformular"
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
