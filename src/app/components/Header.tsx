"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/poetry", label: "Poetry" },
  { href: "/talks", label: "Talks" },
  { href: "/admin/login", label: "Admin Login" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-4xl px-6 flex items-center justify-between h-14">
        <Link href="/" className="text-lg font-bold text-stone-800 hover:text-amber-800 transition-colors">
          Darbha Babu Rao
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-stone-100 transition-colors"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`block w-5 h-0.5 bg-stone-700 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-[3px]" : ""}`} />
          <span className={`block w-5 h-0.5 bg-stone-700 mt-1 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-0.5 bg-stone-700 mt-1 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-stone-100 bg-white px-6 py-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-800 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
