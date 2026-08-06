import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar, MapPin, Search, Filter, Plus, X, Megaphone,
  HeartHandshake, ClipboardList, Clock, Loader2, ChevronDown
} from 'lucide-react';

// ---- Category system -------------------------------------------------
// Each category carries its own color so the date-stub on every card
// becomes a literal, scannable legend of what kind of thing it is.
const CATEGORIES = [
  { id: 'event', label: 'Event', accent: '#6E93B5', tint: '#E8EFF5', Icon: Calendar },
  { id: 'call-to-action', label: 'Call to Action', accent: '#D97C82', tint: '#FBEAEA', Icon: Megaphone },
  { id: 'volunteer', label: 'Volunteer', accent: '#7FA07A', tint: '#EAF1E7', Icon: HeartHandshake },
  { id: 'notice', label: 'Notice', accent: '#9B84B5', tint: '#F0E9F5', Icon: ClipboardList },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

const PAPER = '#FBF8F3';
const INK = '#4A4238';
const INK_SOFT = '#8B8175';
const LINE = '#ECE5D8';
const SIGNAL = '#6E93B5';

const STORAGE_KEY = 'commons-board-posts-v1';

const SAMPLE_POSTS = [
  {
    id: 'seed-1',
    title: 'Downtown Growers Market',
    type: 'event',
    date: '2026-08-08',
    time: '8:00 AM – 1:00 PM',
    location: 'Robinson Park (8th & Central Ave.)',
    description: 'Our favorite weekly market where we go to see our favorite Janie.',
    contact: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'seed-2',
    title: 'Tree NM Tree Planting',
    type: 'volunteer',
    date: '2026-10-03',
    time: '9:00 AM - 12:00 PM',
    location: 'T or C, near hospital',
    description: 'Tree planting with Tree or C. Easy work!',
    contact: 'treenm.org',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
  {
    id: 'seed-3',
    title: 'PNM public comment',
    type: 'call-to-action',
    date: '2026-07-28',
    time: '1:00 PM - 7:00 PM',
    location: 'UNM SUB',
    description: 'The PRC will hear public comment.',
    contact: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
  },
  {
    id: 'seed-4',
    title: 'Whats up with our AC?',
    type: 'notice',
    date: Date.now(), 
    time: 'All day',
    location: 'Our home',
    description: 'Something in our AC sounds weird and this is just a test notice.',
    contact: '',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
];

function nextWeekday(dayOffset) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset + 1);
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatStub(dateStr) {
  const d = parseDate(dateStr);
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

function isPast(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parseDate(dateStr) < today;
}

// ---- Empty form state --------------------------------------------------
const BLANK_FORM = {
  title: '', type: 'event', date: '', time: '', location: '', description: '', contact: '',
};

export default function CommunityBoard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeCats, setActiveCats] = useState(new Set(CATEGORIES.map(c => c.id)));
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('upcoming'); // upcoming | all | past
  const [sortBy, setSortBy] = useState('soonest'); // soonest | newest

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [formError, setFormError] = useState('');

  // ---- Load posts on mount ----
  // NOTE: this uses localStorage for now, so posts only persist in
  // *your own* browser — nothing is shared between visitors yet.
  // This gets replaced with real Supabase calls in the database step.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const value = raw ? JSON.parse(raw) : null;
      setPosts(Array.isArray(value) ? value : []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = useCallback((next) => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      setLoadError(true);
    } finally {
      setSaving(false);
    }
  }, []);

  const loadSampleData = async () => {
    setPosts(SAMPLE_POSTS);
    await persist(SAMPLE_POSTS);
  };

  const toggleCategory = (id) => {
    setActiveCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = posts.filter(p => activeCats.has(p.type));

    if (scope === 'upcoming') list = list.filter(p => !isPast(p.date));
    if (scope === 'past') list = list.filter(p => isPast(p.date));

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      if (sortBy === 'soonest') return parseDate(a.date) - parseDate(b.date);
      return b.createdAt - a.createdAt;
    });

    return list;
  }, [posts, activeCats, scope, query, sortBy]);

  const submitPost = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date || !form.location.trim()) {
      setFormError('Title, date, and location are required.');
      return;
    }
    const newPost = {
      ...form,
      id: `post-${Date.now()}`,
      title: form.title.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      createdAt: Date.now(),
    };
    const next = [newPost, ...posts];
    setPosts(next);
    setShowForm(false);
    setForm(BLANK_FORM);
    setFormError('');
    await persist(next);
  };

  return (
    <div className="min-h-screen w-full" style={{ background: PAPER, color: INK }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Nunito', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        .cb-focus:focus-visible { outline: 2px solid ${SIGNAL}; outline-offset: 2px; }
      `}</style>

      {/* Header */}
      <header className="border-b" style={{ borderColor: LINE }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl" style={{ color: INK }}>
              ABQ Community Commons
            </h1>
            <p className="font-display text-sm sm:text-base mt-1" style={{ color: INK_SOFT }}>
              Our goal is to establish a free, safe place where a connected community can share knowledge, events, and other happenings. 
              We want to create these tools so that they are not dependent on data hungry mega-corporations. 
              We do not seek your time, money, or attention. Go build a better world beyond the computer.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="cb-focus font-display font-semibold text-sm shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full"
            style={{ background: INK, color: PAPER }}
          >
            <Plus size={16} strokeWidth={2.5} /> Post something
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b sticky top-0 z-10" style={{ borderColor: LINE, background: PAPER }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const active = activeCats.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className="cb-focus font-display text-xs sm:text-sm font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition"
                  style={{
                    borderColor: active ? cat.accent : LINE,
                    background: active ? cat.tint : 'transparent',
                    color: active ? cat.accent : INK_SOFT,
                  }}
                >
                  <cat.Icon size={14} /> {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: INK_SOFT }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search title, location, description…"
                className="cb-focus font-display text-sm w-full pl-8 pr-3 py-2 rounded-xl border bg-transparent"
                style={{ borderColor: LINE, color: INK }}
              />
            </div>

            <select
              value={scope}
              onChange={e => setScope(e.target.value)}
              className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: LINE, color: INK }}
            >
              <option value="upcoming">Upcoming</option>
              <option value="all">All dates</option>
              <option value="past">Past</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: LINE, color: INK }}
            >
              <option value="soonest">Sort: Soonest first</option>
              <option value="newest">Sort: Newest posted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Board */}
      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {loading ? (
          <div className="flex items-center gap-2 font-display text-sm py-16 justify-center" style={{ color: INK_SOFT }}>
            <Loader2 size={16} className="animate-spin" /> Loading the board…
          </div>
        ) : loadError ? (
          <div className="font-display text-sm py-16 text-center" style={{ color: INK_SOFT }}>
            Couldn't reach the board's storage. Try reloading.
          </div>
        ) : posts.length === 0 ? (
          <div className="font-display text-sm py-16 text-center flex flex-col items-center gap-4" style={{ color: INK_SOFT }}>
            <p>The board is empty. Be the first to post — or load a few sample notices to see how it looks.</p>
            <button
              onClick={loadSampleData}
              className="cb-focus font-display text-sm font-semibold px-4 py-2 rounded-full border"
              style={{ borderColor: LINE, color: INK }}
            >
              Load sample notices
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="font-display text-sm py-16 text-center" style={{ color: INK_SOFT }}>
            Nothing matches these filters right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(post => {
              const cat = CAT_BY_ID[post.type];
              const stub = formatStub(post.date);
              return (
                <article
                  key={post.id}
                  className="flex rounded-2xl overflow-hidden border bg-white"
                  style={{ borderColor: LINE }}
                >
                  <div
                    className="font-mono flex flex-col items-center justify-center w-16 shrink-0 py-3 rounded-l-2xl"
                    style={{ background: cat.tint, color: cat.accent }}
                  >
                    <span className="text-[10px] font-medium tracking-wide">{stub.month}</span>
                    <span className="text-xl font-semibold leading-none mt-0.5">{stub.day}</span>
                    <span className="text-[10px] mt-0.5">{stub.weekday}</span>
                  </div>
                  <div className="p-4 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 font-display text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: cat.accent }}>
                      <cat.Icon size={12} /> {cat.label}
                    </div>
                    <h3 className="font-display font-bold text-base leading-snug mb-1.5" style={{ color: INK }}>
                      {post.title}
                    </h3>
                    <p className="font-display text-sm leading-relaxed mb-3" style={{ color: INK_SOFT }}>
                      {post.description}
                    </p>
                    <div className="font-mono text-xs space-y-1" style={{ color: INK_SOFT }}>
                      {post.time && (
                        <div className="flex items-center gap-1.5"><Clock size={12} /> {post.time}</div>
                      )}
                      <div className="flex items-center gap-1.5"><MapPin size={12} /> {post.location}</div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* New post modal */}
      {showForm && (
        <div className="fixed inset-0 z-20 flex items-start sm:items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(74,66,56,0.45)' }}>
          <form
            onSubmit={submitPost}
            className="w-full max-w-lg rounded-2xl my-8"
            style={{ background: PAPER }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: LINE }}>
              <h2 className="font-display font-bold text-lg">Post to the board</h2>
              <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="cb-focus p-1 rounded-xl" style={{ color: INK_SOFT }}>
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setForm(f => ({ ...f, type: cat.id }))}
                    className="cb-focus font-display text-xs font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                    style={{
                      borderColor: form.type === cat.id ? cat.accent : LINE,
                      background: form.type === cat.id ? cat.tint : 'transparent',
                      color: form.type === cat.id ? cat.accent : INK_SOFT,
                    }}
                  >
                    <cat.Icon size={13} /> {cat.label}
                  </button>
                ))}
              </div>

              <label className="font-display text-sm flex flex-col gap-1">
                Title
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white"
                  style={{ borderColor: LINE }}
                  placeholder="Saturday farmers market"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-display text-sm flex flex-col gap-1">
                  Date
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white"
                    style={{ borderColor: LINE }}
                  />
                </label>
                <label className="font-display text-sm flex flex-col gap-1">
                  Time (optional)
                  <input
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white"
                    style={{ borderColor: LINE }}
                    placeholder="6:30 PM"
                  />
                </label>
              </div>

              <label className="font-display text-sm flex flex-col gap-1">
                Location
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white"
                  style={{ borderColor: LINE }}
                  placeholder="Town Square, Main St"
                />
              </label>

              <label className="font-display text-sm flex flex-col gap-1">
                Description
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white resize-none"
                  style={{ borderColor: LINE }}
                  placeholder="What should neighbors know?"
                />
              </label>

              <label className="font-display text-sm flex flex-col gap-1">
                Contact (optional)
                <input
                  value={form.contact}
                  onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
                  className="cb-focus font-display text-sm px-3 py-2 rounded-xl border bg-white"
                  style={{ borderColor: LINE }}
                  placeholder="Email or phone for questions"
                />
              </label>

              {formError && (
                <p className="font-display text-sm" style={{ color: '#B75C63' }}>{formError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: LINE }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(''); }}
                className="cb-focus font-display text-sm font-medium px-4 py-2 rounded-full"
                style={{ color: INK_SOFT }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="cb-focus font-display text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-1.5"
                style={{ background: INK, color: PAPER, opacity: saving ? 0.6 : 1 }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Post to the board
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
