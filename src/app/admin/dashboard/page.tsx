"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useToast } from "@/app/components/Toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Poem {
  id: string;
  title: string;
  year: string;
  excerpt: string;
  content: string[];
}

interface Play {
  id: string;
  title: string;
  year: string;
  description: string;
  content: string[];
}

interface ComingSoon {
  id: string;
  title: string;
  content: string;
  type: "poem" | "talk";
}

type TabName = "poems" | "plays" | "coming-soon";

// ─── Blank forms ─────────────────────────────────────────────────────────────

const blankPoem = (): Omit<Poem, "id"> => ({
  title: "",
  year: "",
  excerpt: "",
  content: [],
});

const blankPlay = (): Omit<Play, "id"> => ({
  title: "",
  year: "",
  description: "",
  content: [],
});

const blankComingSoon = (): Omit<ComingSoon, "id"> => ({
  title: "",
  content: "",
  type: "poem",
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function splitContent(raw: string): string[] {
  return raw
    .split(/\n\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PoemForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Poem, "id"> & { id?: string };
  onSave: (data: Omit<Poem, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial.title,
    year: initial.year,
    excerpt: initial.excerpt,
    contentRaw: initial.content.join("\n\n"),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title: form.title,
      year: form.year,
      excerpt: form.excerpt,
      content: splitContent(form.contentRaw),
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            placeholder="కవిత శీర్షిక"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Year</label>
          <input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            placeholder="1985"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Excerpt</label>
        <textarea
          rows={2}
          value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none resize-none"
          placeholder="మొదటి రెండు పంక్తులు..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Content <span className="text-stone-400 font-normal">(separate stanzas with a blank line)</span>
        </label>
        <textarea
          rows={10}
          value={form.contentRaw}
          onChange={(e) => setForm({ ...form, contentRaw: e.target.value })}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none resize-y font-mono text-sm"
          placeholder={"మొదటి చరణం ఇక్కడ...\n\nరెండవ చరణం ఇక్కడ..."}
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Poem"}
        </button>
      </div>
    </form>
  );
}

function PlayForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Play, "id"> & { id?: string };
  onSave: (data: Omit<Play, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial.title,
    year: initial.year,
    description: initial.description,
    contentRaw: initial.content.join("\n\n"),
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      title: form.title,
      year: form.year,
      description: form.description,
      content: splitContent(form.contentRaw),
    });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            placeholder="నాటకం శీర్షిక"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Year</label>
          <input
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            placeholder="1990"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none resize-none"
          placeholder="నాటకం సంక్షిప్త వివరణ..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Content <span className="text-stone-400 font-normal">(separate sections with a blank line)</span>
        </label>
        <textarea
          rows={10}
          value={form.contentRaw}
          onChange={(e) => setForm({ ...form, contentRaw: e.target.value })}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none resize-y font-mono text-sm"
          placeholder={"మొదటి దృశ్యం...\n\nరెండవ దృశ్యం..."}
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Play"}
        </button>
      </div>
    </form>
  );
}

function ComingSoonForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<ComingSoon, "id"> & { id?: string };
  onSave: (data: Omit<ComingSoon, "id">) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial.title,
    content: initial.content,
    type: initial.type,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave({ title: form.title, content: form.content, type: form.type });
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
            placeholder="శీర్షిక"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as "poem" | "talk" })}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
          >
            <option value="poem">Poem</option>
            <option value="talk">Talk</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Content</label>
        <textarea
          rows={6}
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none resize-y"
          placeholder="వివరాలు ఇక్కడ..."
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const addToast = useToast();

  // Auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<TabName>("poems");

  // Data
  const [poems, setPoems] = useState<Poem[]>([]);
  const [plays, setPlays] = useState<Play[]>([]);
  const [comingSoonItems, setComingSoonItems] = useState<ComingSoon[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state: null = hidden, "new" = new item, string = id of item being edited
  const [poemFormState, setPoemFormState] = useState<null | "new" | string>(null);
  const [playFormState, setPlayFormState] = useState<null | "new" | string>(null);
  const [comingSoonFormState, setComingSoonFormState] = useState<null | "new" | string>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
      if (!u) {
        router.replace("/admin/login");
      } else {
        const flag = sessionStorage.getItem("pending_toast");
        if (flag === "login_success") {
          sessionStorage.removeItem("pending_toast");
          addToast("Welcome back!", "success");
        }
      }
    });
    return unsub;
  }, [router, addToast]);

  // ── Fetch poems ─────────────────────────────────────────────────────────────
  const fetchPoems = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "poems"));
    setPoems(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          year: data.year ?? "",
          excerpt: data.excerpt ?? "",
          content: Array.isArray(data.content) ? data.content : [],
        };
      })
    );
    setLoading(false);
  }, []);

  // ── Fetch plays ─────────────────────────────────────────────────────────────
  const fetchPlays = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "plays"));
    setPlays(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          year: data.year ?? "",
          description: data.description ?? "",
          content: Array.isArray(data.content) ? data.content : [],
        };
      })
    );
    setLoading(false);
  }, []);

  // ── Fetch coming-soon ────────────────────────────────────────────────────────
  const fetchComingSoon = useCallback(async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "coming-soon"));
    setComingSoonItems(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? "",
          content: data.content ?? "",
          type: data.type === "talk" ? "talk" : "poem",
        };
      })
    );
    setLoading(false);
  }, []);

  // Fetch when tab changes (once auth is confirmed)
  useEffect(() => {
    if (!user) return;
    if (activeTab === "poems") fetchPoems();
    else if (activeTab === "plays") fetchPlays();
    else fetchComingSoon();
  }, [activeTab, user, fetchPoems, fetchPlays, fetchComingSoon]);

  // ── Poem CRUD ───────────────────────────────────────────────────────────────
  async function savePoem(data: Omit<Poem, "id">) {
    const isNew = poemFormState === "new";
    try {
      if (isNew) {
        await addDoc(collection(db, "poems"), data);
      } else if (poemFormState) {
        await updateDoc(doc(db, "poems", poemFormState), data);
      }
      setPoemFormState(null);
      await fetchPoems();
      addToast(isNew ? "Poem added." : "Poem updated.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  async function deletePoem(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "poems", id));
      setPoems((prev) => prev.filter((p) => p.id !== id));
      addToast("Poem deleted.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  // ── Play CRUD ───────────────────────────────────────────────────────────────
  async function savePlay(data: Omit<Play, "id">) {
    const isNew = playFormState === "new";
    try {
      if (isNew) {
        await addDoc(collection(db, "plays"), data);
      } else if (playFormState) {
        await updateDoc(doc(db, "plays", playFormState), data);
      }
      setPlayFormState(null);
      await fetchPlays();
      addToast(isNew ? "Talk added." : "Talk updated.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  async function deletePlay(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "plays", id));
      setPlays((prev) => prev.filter((p) => p.id !== id));
      addToast("Talk deleted.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  // ── Coming-soon CRUD ─────────────────────────────────────────────────────────
  async function saveComingSoon(data: Omit<ComingSoon, "id">) {
    const isNew = comingSoonFormState === "new";
    try {
      if (isNew) {
        await addDoc(collection(db, "coming-soon"), data);
      } else if (comingSoonFormState) {
        await updateDoc(doc(db, "coming-soon", comingSoonFormState), data);
      }
      setComingSoonFormState(null);
      await fetchComingSoon();
      addToast(isNew ? "Item added." : "Item updated.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  async function deleteComingSoon(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "coming-soon", id));
      setComingSoonItems((prev) => prev.filter((c) => c.id !== id));
      addToast("Item deleted.");
    } catch {
      addToast("Something went wrong.", "error");
    }
  }

  // ── Sign out ─────────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut(auth);
    addToast("Signed out.", "info");
    setTimeout(() => router.replace("/admin/login"), 1500);
  }

  // ── Loading / auth guard render ──────────────────────────────────────────────
  if (!authChecked) {
    return (
      <main className="flex-1 flex items-center justify-center py-16">
        <p className="text-stone-400 text-sm animate-pulse">Checking auth…</p>
      </main>
    );
  }

  if (!user) return null;

  // ── Helpers for form initial values ──────────────────────────────────────────
  const editingPoem =
    poemFormState && poemFormState !== "new"
      ? poems.find((p) => p.id === poemFormState)
      : null;

  const editingPlay =
    playFormState && playFormState !== "new"
      ? plays.find((p) => p.id === playFormState)
      : null;

  const editingComingSoon =
    comingSoonFormState && comingSoonFormState !== "new"
      ? comingSoonItems.find((c) => c.id === comingSoonFormState)
      : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 py-10 px-4 sm:px-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Admin Dashboard</h1>
          <p className="text-stone-400 text-sm mt-0.5">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {(["poems", "plays", "coming-soon"] as TabName[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPoemFormState(null);
              setPlayFormState(null);
              setComingSoonFormState(null);
            }}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors capitalize ${
              activeTab === tab
                ? "bg-white border border-b-white border-stone-200 text-amber-700 -mb-px"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "poems" ? "Poems (కవితలు)" : tab === "plays" ? "Talks (ప్రసంగాలు)" : "Coming Soon (త్వరలో)"}
          </button>
        ))}
      </div>

      {/* ── Poems tab ── */}
      {activeTab === "poems" && (
        <section>
          {/* Add button */}
          {poemFormState === null && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setPoemFormState("new")}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                + Add Poem
              </button>
            </div>
          )}

          {/* Form */}
          {poemFormState !== null && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-6">
              <h2 className="text-base font-semibold text-stone-700 mb-4">
                {poemFormState === "new" ? "New Poem" : "Edit Poem"}
              </h2>
              <PoemForm
                initial={
                  editingPoem
                    ? { ...editingPoem }
                    : blankPoem()
                }
                onSave={savePoem}
                onCancel={() => setPoemFormState(null)}
              />
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-stone-400 text-sm animate-pulse py-4">Loading…</p>
          ) : poems.length === 0 ? (
            <p className="text-stone-400 text-sm py-4">No poems yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {poems.map((poem) => (
                <li
                  key={poem.id}
                  className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">{poem.title || <span className="text-stone-400 italic">Untitled</span>}</p>
                    {poem.year && (
                      <p className="text-stone-400 text-xs mt-0.5">{poem.year}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setPoemFormState(poem.id)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePoem(poem.id, poem.title)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Plays tab ── */}
      {activeTab === "plays" && (
        <section>
          {/* Add button */}
          {playFormState === null && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setPlayFormState("new")}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                + Add Play
              </button>
            </div>
          )}

          {/* Form */}
          {playFormState !== null && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-6">
              <h2 className="text-base font-semibold text-stone-700 mb-4">
                {playFormState === "new" ? "New Play" : "Edit Play"}
              </h2>
              <PlayForm
                initial={
                  editingPlay
                    ? { ...editingPlay }
                    : blankPlay()
                }
                onSave={savePlay}
                onCancel={() => setPlayFormState(null)}
              />
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-stone-400 text-sm animate-pulse py-4">Loading…</p>
          ) : plays.length === 0 ? (
            <p className="text-stone-400 text-sm py-4">No plays yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {plays.map((play) => (
                <li
                  key={play.id}
                  className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-stone-800 truncate">{play.title || <span className="text-stone-400 italic">Untitled</span>}</p>
                    {play.year && (
                      <p className="text-stone-400 text-xs mt-0.5">{play.year}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setPlayFormState(play.id)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deletePlay(play.id, play.title)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Coming Soon tab ── */}
      {activeTab === "coming-soon" && (
        <section>
          {/* Add button */}
          {comingSoonFormState === null && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setComingSoonFormState("new")}
                className="px-4 py-2 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 transition-colors"
              >
                + Add Coming Soon
              </button>
            </div>
          )}

          {/* Form */}
          {comingSoonFormState !== null && (
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 mb-6">
              <h2 className="text-base font-semibold text-stone-700 mb-4">
                {comingSoonFormState === "new" ? "New Coming Soon" : "Edit Coming Soon"}
              </h2>
              <ComingSoonForm
                initial={editingComingSoon ? { ...editingComingSoon } : blankComingSoon()}
                onSave={saveComingSoon}
                onCancel={() => setComingSoonFormState(null)}
              />
            </div>
          )}

          {/* List */}
          {loading ? (
            <p className="text-stone-400 text-sm animate-pulse py-4">Loading…</p>
          ) : comingSoonItems.length === 0 ? (
            <p className="text-stone-400 text-sm py-4">No coming-soon items yet. Add one above.</p>
          ) : (
            <ul className="space-y-2">
              {comingSoonItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3 gap-4"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span
                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        item.type === "poem"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {item.type === "poem" ? "Poem" : "Talk"}
                    </span>
                    <p className="font-medium text-stone-800 truncate">
                      {item.title || <span className="text-stone-400 italic">Untitled</span>}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setComingSoonFormState(item.id)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteComingSoon(item.id, item.title)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
