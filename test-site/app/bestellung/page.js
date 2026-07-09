"use client";
import { useState } from "react";
import { Field, Input, Select, Textarea } from "../../components/StepWizard";

/* Single-page order form with a REAL <form> element.
   The multi-step wizards on this site use <div>+button (no native submit event),
   so FormAssist's Submit-Review interceptor never fires there. This page is the
   demo finale: a real <form onSubmit> that triggers the pre-submit review,
   plus a radio group / checkbox group / select for the chat-command demo. */
export default function BestellungPage() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🍕</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Bestellung eingegangen!</h2>
        <p className="text-gray-600 mb-6">
          Danke — deine Pizza ist unterwegs. (Demo-Seite, es wurde natürlich nichts bestellt.)
        </p>
        <button
          onClick={() => setDone(false)}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
        >
          Neue Bestellung
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">🍕 Pizzeria Da Demo — Online-Bestellung</h1>
      <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-6">
        Tests: <code>echtes &lt;form&gt;-Element</code> (löst Submit-Review aus), Radio-Gruppe,
        Checkbox-Gruppe, <code>select</code>, deutsche Labels + <code>autocomplete</code>.
      </p>

      <form
        id="order-form"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
        className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8"
      >
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Kontakt &amp; Lieferadresse</h2>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            <span className="text-red-500">*</span> Pflichtfeld / required
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Vorname" required htmlFor="vorname">
            <Input id="vorname" autoComplete="given-name" placeholder="z. B. Max" />
          </Field>
          <Field label="Nachname" required htmlFor="nachname">
            <Input id="nachname" autoComplete="family-name" placeholder="z. B. Mustermann" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefon" required htmlFor="telefon" hint="Für Rückfragen zur Lieferung">
            <Input id="telefon" type="tel" autoComplete="tel" placeholder="+49 …" ariaDescribedBy="telefon-hint" />
          </Field>
          <Field label="E-Mail-Adresse" required htmlFor="email" hint="Bestellbestätigung geht hierhin">
            <Input id="email" type="email" autoComplete="email" placeholder="max@beispiel.de" ariaDescribedBy="email-hint" />
          </Field>
        </div>

        <Field label="Straße und Hausnummer" required htmlFor="strasse">
          <Input id="strasse" autoComplete="street-address" placeholder="Musterstraße 42" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="PLZ" required htmlFor="plz">
            <Input id="plz" autoComplete="postal-code" inputMode="numeric" maxLength={5} placeholder="10115" />
          </Field>
          <Field label="Ort" required htmlFor="ort">
            <Input id="ort" autoComplete="address-level2" placeholder="Berlin" />
          </Field>
        </div>

        <div className="mt-6 mb-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Deine Pizza</h2>
        </div>

        <Field label="Größe" required htmlFor="groesse-group">
          <div className="flex flex-wrap gap-5 mt-1" id="groesse-group" role="radiogroup" aria-labelledby="groesse-label">
            <span id="groesse-label" className="sr-only">Größe</span>
            {[
              ["klein", "Klein (26 cm)"],
              ["mittel", "Mittel (30 cm)"],
              ["gross", "Groß (36 cm)"],
            ].map(([val, txt]) => (
              <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="groesse" value={val} required className="accent-indigo-600" />
                {txt}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Extra-Beläge" htmlFor="belag-group">
          <div className="flex flex-wrap gap-5 mt-1" id="belag-group">
            {[
              ["salami", "Salami"],
              ["pilze", "Pilze"],
              ["zwiebeln", "Zwiebeln"],
              ["kaese", "Extra Käse"],
            ].map(([val, txt]) => (
              <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="belag" value={val} className="accent-indigo-600" />
                {txt}
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Gewünschte Lieferzeit" htmlFor="lieferzeit" hint="Leer lassen = so schnell wie möglich">
            <Input id="lieferzeit" type="time" ariaDescribedBy="lieferzeit-hint" />
          </Field>
          <Field label="Zahlungsart" required htmlFor="zahlung">
            <Select id="zahlung">
              <option value="">Bitte wählen…</option>
              <option value="bar">Bar bei Lieferung</option>
              <option value="karte">Karte bei Lieferung</option>
              <option value="paypal">PayPal</option>
            </Select>
          </Field>
        </div>

        <Field label="Anmerkungen zur Bestellung" htmlFor="anmerkung">
          <Textarea id="anmerkung" rows={2} placeholder="z. B. bitte klingeln, 3. Stock" />
        </Field>

        <div className="flex justify-end mt-5">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
          >
            Bestellung absenden
          </button>
        </div>
      </form>
    </div>
  );
}
