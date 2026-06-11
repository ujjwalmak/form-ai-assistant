import "./globals.css";
import { ThemeToggle } from "../components/ThemeToggle";

export const metadata = {
  title: "FormAssist Test Suite",
  description: "Complex multi-step forms for testing the FormAssist Chrome extension",
};

// Runs synchronously during HTML parsing, before first paint, so the saved
// theme (or system preference) is applied with no flash and no hydration error.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
          </div>
          <ThemeToggle />
        </nav>
        <main className="max-w-4xl mx-auto py-10 px-4">{children}</main>
      </body>
    </html>
  );
}
