"use client";
import { useState } from "react";
import { useWizard, WizardShell, Field, Input, Select, SuccessScreen } from "../../components/StepWizard";

const STEPS = ["Cart Review", "Shipping Info", "Payment", "Confirmation"];

const CART_ITEMS = [
  { id: 1, name: "Wireless Noise-Cancelling Headphones", price: 249.99, qty: 1, sku: "WNC-400" },
  { id: 2, name: "USB-C Charging Hub (7-in-1)", price: 59.99, qty: 2, sku: "HUB-7C" },
  { id: 3, name: "Mechanical Keyboard — Tactile Switches", price: 139.00, qty: 1, sku: "KB-MX87" },
];

/* ── Step 1: Cart Review ────────────────────────────────────────────── */
function StepCart() {
  const [coupon, setCoupon] = useState("");
  const subtotal = CART_ITEMS.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = coupon.toUpperCase() === "FORMASSIST" ? subtotal * 0.1 : 0;
  const shipping = 9.99;
  const total = subtotal - discount + shipping;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-amber-50 rounded-lg p-3">
        Tests: coupon code input, read-only order summary fields (no autocomplete needed).
      </p>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Product</th>
              <th className="text-center px-4 py-2">Qty</th>
              <th className="text-right px-4 py-2">Price</th>
            </tr>
          </thead>
          <tbody>
            {CART_ITEMS.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400">SKU: {item.sku}</div>
                </td>
                <td className="text-center px-4 py-3">
                  <input
                    type="number"
                    id={`qty-${item.id}`}
                    name={`qty-${item.id}`}
                    defaultValue={item.qty}
                    min="1"
                    max="99"
                    className="w-14 text-center border border-gray-300 rounded px-2 py-1 text-sm"
                  />
                </td>
                <td className="text-right px-4 py-3 font-medium">
                  €{(item.price * item.qty).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount (10%)</span><span>-€{discount.toFixed(2)}</span></div>}
        <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>€{shipping.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2"><span>Total</span><span>€{total.toFixed(2)}</span></div>
      </div>

      <div className="flex gap-3">
        <input
          id="coupon-code"
          name="coupon-code"
          type="text"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          placeholder="Coupon code (try FORMASSIST)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button type="button" className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition">
          Apply
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Shipping ───────────────────────────────────────────────── */
function StepShipping() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-amber-50 rounded-lg p-3">
        Tests: full <code>autocomplete</code> shipping address suite, shipping method radio.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name" required htmlFor="ship-given-name">
          <Input id="ship-given-name" autoComplete="given-name" placeholder="John" />
        </Field>
        <Field label="Last Name" required htmlFor="ship-family-name">
          <Input id="ship-family-name" autoComplete="family-name" placeholder="Doe" />
        </Field>
      </div>

      <Field label="Email Address" required htmlFor="ship-email" hint="Order confirmation will be sent here">
        <Input id="ship-email" type="email" autoComplete="email" placeholder="john@example.com" ariaDescribedBy="ship-email-hint" />
      </Field>

      <Field label="Phone" required htmlFor="ship-tel" hint="For delivery notifications">
        <Input id="ship-tel" type="tel" autoComplete="tel" placeholder="+43 664 123456" ariaDescribedBy="ship-tel-hint" />
      </Field>

      <Field label="Address Line 1" required htmlFor="ship-address">
        <Input id="ship-address" autoComplete="shipping street-address" placeholder="Hauptstraße 15" />
      </Field>

      <Field label="Address Line 2" htmlFor="ship-address-2">
        <Input id="ship-address-2" autoComplete="shipping address-line2" placeholder="Apartment, floor, etc." />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="City" required htmlFor="ship-city">
            <Input id="ship-city" autoComplete="shipping address-level2" placeholder="Vienna" />
          </Field>
        </div>
        <Field label="ZIP Code" required htmlFor="ship-zip">
          <Input id="ship-zip" autoComplete="shipping postal-code" placeholder="1010" />
        </Field>
      </div>

      <Field label="Country" required htmlFor="ship-country">
        <Select id="ship-country" autoComplete="shipping country">
          <option value="">Select…</option>
          <option value="AT">Austria</option>
          <option value="DE">Germany</option>
          <option value="CH">Switzerland</option>
          <option value="US">United States</option>
        </Select>
      </Field>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Shipping Method</p>
        <div className="space-y-2">
          {[
            { id: "ship-standard", label: "Standard (3–5 business days)", price: "€9.99", value: "standard" },
            { id: "ship-express", label: "Express (1–2 business days)", price: "€19.99", value: "express" },
            { id: "ship-overnight", label: "Overnight (next business day)", price: "€34.99", value: "overnight" },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-amber-400 transition">
              <div className="flex items-center gap-3">
                <input type="radio" name="shipping-method" value={opt.value} id={opt.id} className="accent-amber-500" />
                <span className="text-sm">{opt.label}</span>
              </div>
              <span className="text-sm font-medium">{opt.price}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Payment ────────────────────────────────────────────────── */
function StepPayment() {
  const [method, setMethod] = useState("card");
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-amber-50 rounded-lg p-3">
        Tests: <code>autocomplete=cc-name/cc-number/cc-exp/cc-csc</code>, conditional payment method sections.
      </p>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "method-card", label: "Credit/Debit Card", value: "card" },
            { id: "method-paypal", label: "PayPal", value: "paypal" },
            { id: "method-bank", label: "Bank Transfer", value: "bank" },
          ].map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-2 border-2 rounded-lg px-3 py-2 cursor-pointer transition text-sm
                ${method === opt.value ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:border-amber-300"}`}
            >
              <input type="radio" name="payment-method" value={opt.value}
                checked={method === opt.value} onChange={() => setMethod(opt.value)}
                className="accent-amber-500" />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {method === "card" && (
        <div className="space-y-4 border border-gray-200 rounded-xl p-4">
          <Field label="Cardholder Name" required htmlFor="cc-name">
            <Input id="cc-name" autoComplete="cc-name" placeholder="John Doe" />
          </Field>
          <Field label="Card Number" required htmlFor="cc-number">
            <Input id="cc-number" autoComplete="cc-number" placeholder="4242 4242 4242 4242" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry Date (MM/YY)" required htmlFor="cc-exp">
              <Input id="cc-exp" autoComplete="cc-exp" placeholder="12/27" />
            </Field>
            <Field label="Security Code (CVV)" required htmlFor="cc-csc" hint="3 or 4 digits on back of card">
              <Input id="cc-csc" autoComplete="cc-csc" placeholder="123" ariaDescribedBy="cc-csc-hint" />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="save-card" name="save-card" className="accent-amber-500 w-4 h-4" />
            <label htmlFor="save-card" className="text-sm text-gray-700">Save card for future orders</label>
          </div>
        </div>
      )}

      {method === "paypal" && (
        <div className="border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-600">
          <div className="text-3xl mb-3">🔵</div>
          <p>You will be redirected to PayPal to complete payment after review.</p>
          <Field label="PayPal Email" htmlFor="paypal-email" hint="Optional — pre-fill your PayPal email">
            <Input id="paypal-email" type="email" autoComplete="email" placeholder="your@paypal.com" ariaDescribedBy="paypal-email-hint" />
          </Field>
        </div>
      )}

      {method === "bank" && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <Field label="Account Holder Name" htmlFor="bank-name">
            <Input id="bank-name" placeholder="Full name on account" autoComplete="name" />
          </Field>
          <Field label="IBAN" required htmlFor="iban">
            <Input id="iban" placeholder="AT61 1904 3002 3457 3201" />
          </Field>
          <Field label="BIC / SWIFT" htmlFor="bic">
            <Input id="bic" placeholder="RLNWATWW" />
          </Field>
        </div>
      )}

      <div className="flex items-start gap-3">
        <input type="checkbox" id="billing-same" name="billing-same" defaultChecked className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0" />
        <label htmlFor="billing-same" className="text-sm text-gray-700">Billing address same as shipping address</label>
      </div>

      <Field label="Order Notes (optional)" htmlFor="order-notes">
        <textarea id="order-notes" name="order-notes" rows={3}
          placeholder="Leave instructions for delivery, gift messages, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
        />
      </Field>
    </div>
  );
}

/* ── Step 4: Confirmation ───────────────────────────────────────────── */
function StepConfirmation() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 bg-amber-50 rounded-lg p-3">
        Final review step — verify all details before submitting.
      </p>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        <p className="font-semibold text-base mb-1">Order Summary</p>
        <p>3 items · Estimated delivery: 3–5 business days</p>
      </div>

      {[
        { section: "Contact", items: ["john@example.com", "+43 664 123456"] },
        { section: "Shipping Address", items: ["John Doe", "Hauptstraße 15", "1010 Vienna, Austria"] },
        { section: "Payment", items: ["Visa ending in 4242", "CVV verified"] },
      ].map(({ section, items }) => (
        <div key={section} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">{section}</h3>
          </div>
          <div className="px-4 py-3 space-y-1">
            {items.map((item) => (
              <p key={item} className="text-sm text-gray-600">{item}</p>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-start gap-3">
        <input type="checkbox" id="final-consent" name="final-consent" required
          className="mt-0.5 accent-amber-500 w-4 h-4 shrink-0" />
        <label htmlFor="final-consent" className="text-sm text-gray-700">
          I confirm this order and agree to the <a href="#" className="text-amber-600 underline">Terms &amp; Conditions</a>.
        </label>
      </div>

      <Field label="Special Delivery Instructions" htmlFor="delivery-instructions">
        <Input id="delivery-instructions" placeholder="Leave at door, ring bell twice, etc." />
      </Field>
    </div>
  );
}

const STEP_COMPONENTS = [StepCart, StepShipping, StepPayment, StepConfirmation];

export default function CheckoutPage() {
  const wizard = useWizard(STEPS.length);
  const [done, setDone] = useState(false);

  if (done) return <SuccessScreen title="Order Placed Successfully!" onReset={() => { setDone(false); wizard.setStep(0); }} />;

  return (
    <WizardShell
      title="E-Commerce Checkout"
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
