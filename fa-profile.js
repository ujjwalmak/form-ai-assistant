'use strict';

const PROFILE_FIELDS = [
  { key: 'firstName',   label: 'Vorname',          group: 'person',  ac: ['given-name'],                     kw: ['vorname','first name','given name','firstname'] },
  { key: 'lastName',    label: 'Nachname',          group: 'person',  ac: ['family-name'],                    kw: ['nachname','familienname','last name','surname','lastname'] },
  { key: 'email',       label: 'E-Mail',            group: 'contact', ac: ['email'],                          kw: ['email','e-mail','mail'] },
  { key: 'phone',       label: 'Telefon',           group: 'contact', ac: ['tel'],                            kw: ['telefon','handy','mobil','rufnummer','phone','tel'] },
  { key: 'birthdate',   label: 'Geburtsdatum',      group: 'person',  ac: ['bday'],                           kw: ['geburtstag','geburtsdatum','geboren','birthdate','birthday','birth date'] },
  { key: 'birthplace',  label: 'Geburtsort',        group: 'person',  ac: [],                                 kw: ['geburtsort','birthplace','birth city','birth place'] },
  { key: 'nationality', label: 'Nationalität',      group: 'person',  ac: [],                                 kw: ['nationalität','staatsangehörigkeit','nationality','citizenship'] },
  { key: 'street',      label: 'Straße + Nr.',      group: 'address', ac: ['street-address','address-line1'], kw: ['straße','adresse','street','address'] },
  { key: 'zip',         label: 'Postleitzahl',      group: 'address', ac: ['postal-code'],                    kw: ['plz','postleitzahl','zip','postal'] },
  { key: 'city',        label: 'Stadt',             group: 'address', ac: ['address-level2'],                 kw: ['stadt','wohnort','ort','city','town'] },
  { key: 'country',     label: 'Land',              group: 'address', ac: ['country','country-name'],         kw: ['land','country'] },
  { key: 'iban',        label: 'IBAN',              group: 'bank',    ac: [],                                 kw: ['iban'] },
  { key: 'bic',         label: 'BIC',               group: 'bank',    ac: [],                                 kw: ['bic','swift'] },
  { key: 'company',     label: 'Unternehmen',       group: 'job',     ac: ['organization'],                   kw: ['firma','unternehmen','company','organization','organisation'] },
  { key: 'jobTitle',    label: 'Berufsbezeichnung', group: 'job',     ac: ['organization-title'],             kw: ['beruf','position','job title','berufsbezeichnung'] },
];

const FAKE_DATA = {
  firstName: 'Max', lastName: 'Mustermann', email: 'max.mustermann@example.com',
  phone: '+49 170 1234567', birthdate: '01.01.1990', birthplace: 'Berlin',
  nationality: 'Deutsch', street: 'Musterstraße 42', zip: '10115',
  city: 'Berlin', country: 'Deutschland', iban: 'DE89370400440532013000',
  bic: 'COBADEFFXXX', company: 'Muster GmbH', jobTitle: 'Software-Entwickler',
};

// ── Test export (Node/Vitest only; `module` is undefined in the browser) ──────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PROFILE_FIELDS, FAKE_DATA };
}
