import "./globals.css";

export const metadata = {
  title: "FormAssist Test Suite",
  description: "Complex multi-step forms for testing the FormAssist Chrome extension",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-indigo-700 text-white px-6 py-3 flex items-center gap-6 shadow-md">
          <a href="/" className="font-bold text-lg tracking-tight shrink-0">FormAssist Test Suite</a>
          <div className="flex gap-4 text-sm flex-wrap">
            <a href="/registration" className="hover:text-indigo-200 transition">Registration</a>
            <a href="/application" className="hover:text-indigo-200 transition">Job App</a>
            <a href="/medical" className="hover:text-indigo-200 transition">Medical (DE)</a>
            <a href="/checkout" className="hover:text-indigo-200 transition">Checkout</a>
            <a href="/insurance" className="hover:text-indigo-200 transition">Insurance</a>
            <a href="/survey" className="hover:text-indigo-200 transition">Survey</a>
            <a href="/bestellung" className="hover:text-indigo-200 transition">Bestellung</a>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto py-10 px-4">{children}</main>
      </body>
    </html>
  );
}
