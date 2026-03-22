import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-8 mt-auto">
      <div className="mx-auto max-w-4xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
        <p>&copy; 2026 Darbha Babu Rao. All rights reserved.</p>
        <nav className="flex gap-6">
          <Link href="/privacy" className="hover:text-stone-800 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-stone-800 transition-colors">
            Terms &amp; Conditions
          </Link>
          <Link href="/admin/login" className="hover:text-stone-800 transition-colors">
            Admin Login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
