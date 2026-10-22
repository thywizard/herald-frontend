'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin, Card, Ico, Spinner, useToast } from '../../../components/studio';
import { SafeImage } from '../../../components/cards';
import {
  createArticle,
  updateArticle,
  publishArticle,
  getAdminArticle,
  uploadImage,
  aiAssist,
  parseArticleBody,
  CATEGORIES,
} from '../../../lib/data';

const DRAFT_KEY = 'studio_draft_v1';
const EMPTY = { headline: '', body: '', image: '', category: 'politics', source: '' };

const inputClass =
  'w-full px-3.5 py-2.5 border border-rule rounded-xl text-sm text-ink bg-paper placeholder:text-ink-soft focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

const AI_ACTIONS = [
  { id: 'headlines', label: 'Headlines' },
  { id: 'keypoint', label: 'Share line' },
  { id: 'summary', label: 'Summary' },
  { id: 'proofread', label: 'Proofread' },
  { id: 'expand', label: 'Continue' },
];

function readMins(body) {
  const words = body.replace(/\[\[[^\]]*\]\]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return { words, mins: Math.max(1, Math.round(words / 200)) };
}

// Renders the article the way readers will see it, including images placed
// inside the text, so mistakes are caught before publishing.
function Preview({ form }) {
  const segments = parseArticleBody(form.body.replace(/\[\[uploading:[^\]]*\]\]/g, ''));
  return (
    <div className="border border-rule rounded-2xl overflow-hidden bg-paper">
      {form.image && (
        <div className="relative w-full aspect-[4/3] bg-rule">
          <SafeImage src={form.image} fill sizes="100vw" className="object-cover" priority />
        </div>
      )}
      <div className="p-4">
        <span className="text-accent-dark text-xs font-bold uppercase tracking-wide">{form.category}</span>
        <h2 className="font-serif text-2xl font-semibold text-ink leading-tight mt-1 mb-3">{form.headline || 'Untitled'}</h2>
        <p className="text-sm text-teal font-medium mb-4">{form.source || 'Staff'}</p>
        <div className="font-serif text-ink leading-relaxed">
          {segments.length === 0 && <p className="text-ink-soft text-sm">Nothing written yet.</p>}
          {segments.map((seg, i) =>
            seg.type === 'image' ? (
              <div key={i} className="relative w-full aspect-[4/3] bg-rule rounded-lg overflow-hidden my-4">
                <SafeImage src={seg.url} fill sizes="100vw" className="object-cover" />
              </div>
            ) : (
              <p key={i} className="whitespace-pre-line break-words mb-4">{seg.value}</p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function EditorInner() {
  const { key, role } = useAdmin();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');

  const [form, setForm] = useState(EMPTY);
  const [loadedStatus, setLoadedStatus] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(!!editId);
  const [tab, setTab] = useState('write'); // write | preview
  const [priority, setPriority] = useState('normal');
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [inlineUploads, setInlineUploads] = useState(0);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [ai, setAi] = useState({ action: null, loading: false, result: '', error: '' });
  const [toast, show] = useToast();
  const bodyRef = useRef(null);
  const selRef = useRef(0); // last known caret position in the body
  const dirtyRef = useRef(false);

  const update = (patch) => {
    dirtyRef.current = true;
    setForm((f) => ({ ...f, ...patch }));
  };

  // ----- load article for editing -----
  useEffect(() => {
    if (!editId) return;
    getAdminArticle(key, editId)
      .then((a) => {
        setForm({ headline: a.headline, body: a.body, image: a.image, category: a.category, source: a.source || '' });
        setLoadedStatus(a.status);
      })
      .catch(() => show('Could not load that article'))
      .finally(() => setLoadingArticle(false));
  }, [editId, key, show]);

  // ----- draft safety net (new articles only) -----
  // Everything typed is mirrored to this device every second, so a closed tab,
  // a crash or a failed upload can never lose a half-written article again.
  useEffect(() => {
    if (editId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
      if (saved && (saved.headline || saved.body)) setPendingDraft(saved);
    } catch {
      // ignore
    }
  }, [editId]);

  useEffect(() => {
    if (editId || !dirtyRef.current) return;
    const t = setTimeout(() => {
      try {
        if (form.headline || form.body) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // ignore
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [form, editId]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  }

  // ----- caret tracking so "insert image" lands where you were typing -----
  const rememberCaret = useCallback(() => {
    const t = bodyRef.current;
    if (t) selRef.current = t.selectionEnd ?? t.selectionStart ?? 0;
  }, []);

  // ----- cover image -----
  async function handleCover(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCoverUploading(true);
    try {
      const { url } = await uploadImage(key, file);
      update({ image: url });
    } catch {
      show('Upload failed — you can paste an image URL instead');
    } finally {
      setCoverUploading(false);
    }
  }

  // ----- inline image -----
  // A placeholder is dropped into the text IMMEDIATELY at the caret, then
  // swapped for the real [[img:url]] when the upload finishes. Because the
  // swap is applied to whatever the body is at that moment, anything typed
  // while the image uploads is kept — the old version rebuilt the body from a
  // stale copy, which silently threw away text typed during the upload.
  async function handleInlineImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const id = Math.random().toString(36).slice(2, 8);
    const placeholder = `[[uploading:${id}]]`;

    dirtyRef.current = true;
    setForm((f) => {
      const at = Math.min(selRef.current, f.body.length);
      const before = f.body.slice(0, at);
      const after = f.body.slice(at);
      const lead = before && !before.endsWith('\n') ? '\n' : '';
      const tail = after && !after.startsWith('\n') ? '\n' : '';
      return { ...f, body: `${before}${lead}${placeholder}${tail}${after}` };
    });
    setInlineUploads((n) => n + 1);

    try {
      const { url } = await uploadImage(key, file);
      setForm((f) => ({ ...f, body: f.body.replace(placeholder, `[[img:${url}]]`) }));
      show('Image added');
    } catch {
      setForm((f) => ({ ...f, body: f.body.replace(`\n${placeholder}`, '').replace(placeholder, '') }));
      show('Image upload failed');
    } finally {
      setInlineUploads((n) => n - 1);
    }
  }

  // ----- AI assist -----
  async function runAi(action) {
    if (!form.headline && !form.body) {
      show('Write something first');
      return;
    }
    setAi({ action, loading: true, result: '', error: '' });
    try {
      const { result } = await aiAssist(key, action, { headline: form.headline, body: form.body });
      setAi({ action, loading: false, result, error: '' });
    } catch (err) {
      setAi({ action, loading: false, result: '', error: /503|configured/.test(err.message) ? 'Herald AI is not available right now.' : 'AI request failed — try again.' });
    }
  }

  function applyAi() {
    if (ai.action === 'proofread') {
      if (!confirm('Replace the whole body with the proofread version?')) return;
      update({ body: ai.result });
    } else if (ai.action === 'expand') {
      update({ body: `${form.body.replace(/\s+$/, '')}\n\n${ai.result}` });
    }
    setAi({ action: null, loading: false, result: '', error: '' });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      show('Copied');
    } catch {
      show('Could not copy');
    }
  }

  // ----- save / publish -----
  const uploading = coverUploading || inlineUploads > 0 || form.body.includes('[[uploading:');
  const valid = form.headline.trim() && form.body.trim() && form.image && form.category;

  async function save(mode) {
    // mode: 'publish' | 'draft' | 'save'
    if (!valid) {
      show('Headline, body and a cover image are required');
      return;
    }
    setSaving(mode);
    try {
      if (editId) {
        await updateArticle(key, editId, form);
        if (mode === 'publish' && loadedStatus !== 'published') await publishArticle(key, editId);
        show(mode === 'publish' ? 'Published' : 'Changes saved');
      } else {
        await createArticle(key, {
          ...form,
          origin: role === 'editor' ? 'editor' : 'admin',
          status: mode === 'draft' ? 'pending' : 'published',
          priority,
          notify: role === 'admin' && mode === 'publish' ? notify : false,
        });
        clearDraft();
        show(mode === 'draft' ? 'Saved as draft' : 'Published');
      }
      dirtyRef.current = false;
      setTimeout(() => router.push('/admin/articles'), 600);
    } catch {
      show('Failed to save — check all fields and your connection');
    } finally {
      setSaving('');
    }
  }

  const { words, mins } = readMins(form.body);

  if (loadingArticle) {
    return <div className="flex justify-center py-24"><Spinner /></div>;
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-ink">{editId ? 'Edit article' : 'Write'}</h1>
        <div className="flex rounded-full bg-rule/50 p-0.5">
          {['write', 'preview'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize ${tab === t ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {pendingDraft && !editId && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 p-3.5">
          <p className="text-sm font-medium text-ink">You have an unsaved draft</p>
          <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">{pendingDraft.headline || 'Untitled'}</p>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => {
                setForm({ ...EMPTY, ...pendingDraft });
                dirtyRef.current = true;
                setPendingDraft(null);
              }}
              className="px-3.5 py-1.5 rounded-full bg-accent text-white text-xs font-semibold"
            >
              Restore
            </button>
            <button
              onClick={() => {
                clearDraft();
                setPendingDraft(null);
              }}
              className="px-3.5 py-1.5 rounded-full border border-rule text-xs font-medium text-ink-soft"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {tab === 'preview' ? (
        <Preview form={form} />
      ) : (
        <>
          <input
            placeholder="Headline"
            value={form.headline}
            onChange={(e) => update({ headline: e.target.value })}
            className={`${inputClass} font-serif text-lg font-semibold`}
          />

          {/* Body + toolbar */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rule text-xs font-medium text-ink cursor-pointer active:bg-rule/40">
                <Ico name="image" size={14} />
                Add image here
                <input type="file" accept="image/*" onChange={handleInlineImage} className="hidden" />
              </label>
              <span className="text-[11px] text-ink-soft">
                {words} words · {mins} min read
                {inlineUploads > 0 && ' · uploading…'}
              </span>
            </div>
            <textarea
              ref={bodyRef}
              placeholder="Write the article. Tap where you want a picture, then “Add image here”."
              value={form.body}
              onChange={(e) => {
                update({ body: e.target.value });
                rememberCaret();
              }}
              onSelect={rememberCaret}
              onKeyUp={rememberCaret}
              onClick={rememberCaret}
              onBlur={rememberCaret}
              rows={14}
              className={`${inputClass} font-serif leading-relaxed`}
            />
            <p className="text-[11px] text-ink-soft mt-1.5">
              Images appear as <code className="px-1 rounded bg-rule/60">[[img:…]]</code> lines — leave them in place; check them under Preview. You can keep typing while one uploads.
            </p>
          </div>

          {/* AI assist */}
          <Card className="p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <Ico name="ai" size={16} className="text-accent-dark" />
              <p className="text-sm font-semibold text-ink">AI assistant</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {AI_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => runAi(a.id)}
                  disabled={ai.loading}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border disabled:opacity-50 ${
                    ai.action === a.id ? 'border-accent bg-accent/10 text-accent-dark' : 'border-rule text-ink'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {ai.loading && (
              <div className="flex items-center gap-2 text-xs text-ink-soft mt-3"><Spinner /> Working…</div>
            )}
            {ai.error && <p className="text-xs text-red-600 mt-3">{ai.error}</p>}

            {!ai.loading && ai.result && (
              <div className="mt-3 rounded-xl bg-rule/30 p-3">
                {ai.action === 'headlines' ? (
                  <div className="space-y-1.5">
                    {ai.result.split('\n').map((l) => l.replace(/^[-*\d.\s"]+|"$/g, '').trim()).filter(Boolean).map((line, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          update({ headline: line });
                          setAi({ action: null, loading: false, result: '', error: '' });
                        }}
                        className="block w-full text-left text-sm text-ink px-3 py-2 rounded-lg bg-paper border border-rule active:bg-accent/10"
                      >
                        {line}
                      </button>
                    ))}
                    <p className="text-[11px] text-ink-soft pt-1">Tap one to use it as the headline.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-ink whitespace-pre-line break-words max-h-60 overflow-y-auto">{ai.result}</p>
                    <div className="flex gap-2 mt-3">
                      {(ai.action === 'proofread' || ai.action === 'expand') && (
                        <button onClick={applyAi} className="px-3.5 py-1.5 rounded-full bg-accent text-white text-xs font-semibold">
                          {ai.action === 'proofread' ? 'Replace body' : 'Add to body'}
                        </button>
                      )}
                      <button onClick={() => copyText(ai.result)} className="px-3.5 py-1.5 rounded-full border border-rule text-xs font-medium text-ink">Copy</button>
                      <button onClick={() => setAi({ action: null, loading: false, result: '', error: '' })} className="px-3.5 py-1.5 text-xs text-ink-soft">Dismiss</button>
                    </div>
                  </>
                )}
              </div>
            )}
            <p className="text-[11px] text-ink-soft mt-2.5">AI can get facts wrong — always check before publishing.</p>
          </Card>

          {/* Cover */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft mb-1.5 uppercase tracking-wide">Cover image</label>
            {form.image && (
              <div className="relative w-full aspect-video bg-rule rounded-xl overflow-hidden mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="w-full h-full object-cover" />
                {coverUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm">Uploading…</div>
                )}
                <button
                  onClick={() => update({ image: '' })}
                  aria-label="Remove cover"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <Ico name="x" size={14} />
                </button>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-rule rounded-xl text-sm text-ink-soft cursor-pointer active:bg-rule/30">
              <Ico name="download" size={18} className="rotate-180" />
              {coverUploading ? 'Uploading…' : form.image ? 'Replace cover image' : 'Upload cover image'}
              <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
            </label>
            <input
              placeholder="…or paste an image URL"
              value={form.image}
              onChange={(e) => update({ image: e.target.value })}
              className={`${inputClass} mt-2`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => update({ category: e.target.value })} className={`${inputClass} capitalize`}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              placeholder="Byline (default: Staff)"
              value={form.source}
              onChange={(e) => update({ source: e.target.value })}
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* Publish options */}
      {role === 'admin' && !editId && (
        <Card className="p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Send push notification</p>
              <p className="text-xs text-ink-soft">Alerts every subscribed device on publish</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notify}
              onClick={() => setNotify((n) => !n)}
              className={`relative w-12 h-7 shrink-0 rounded-full transition-colors ${notify ? 'bg-accent' : 'bg-ink-soft/30'}`}
            >
              <span className={`absolute left-0 top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${notify ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {notify && (
            <div className="flex gap-2 mt-3">
              {['normal', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                    priority === p ? (p === 'high' ? 'bg-red-600 text-white' : 'bg-ink text-paper') : 'bg-rule/50 text-ink-soft'
                  }`}
                >
                  {p === 'high' ? 'High (breaking)' : 'Normal'}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="sticky bottom-20 z-10 flex gap-2 pt-1">
        {editId ? (
          <>
            <button
              onClick={() => save('save')}
              disabled={!!saving || uploading}
              className="flex-1 py-3 rounded-full border border-rule bg-paper text-sm font-semibold text-ink disabled:opacity-50"
            >
              {saving === 'save' ? 'Saving…' : 'Save changes'}
            </button>
            {loadedStatus !== 'published' && (
              <button
                onClick={() => save('publish')}
                disabled={!!saving || uploading}
                className="flex-1 py-3 rounded-full bg-accent text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving === 'publish' ? 'Publishing…' : 'Save & publish'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() => save('draft')}
              disabled={!!saving || uploading}
              className="flex-1 py-3 rounded-full border border-rule bg-paper text-sm font-semibold text-ink disabled:opacity-50"
            >
              {saving === 'draft' ? 'Saving…' : 'Save draft'}
            </button>
            <button
              onClick={() => save('publish')}
              disabled={!!saving || uploading}
              className="flex-[1.4] py-3 rounded-full bg-accent text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving === 'publish' ? 'Publishing…' : uploading ? 'Waiting for image…' : notify ? 'Publish & notify' : 'Publish'}
            </button>
          </>
        )}
      </div>
      {toast}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-24"><Spinner /></div>}>
      <EditorInner />
    </Suspense>
  );
}
