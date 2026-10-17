'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../components/interactive';
import { createArticle, uploadImage, CATEGORIES } from '../../../lib/data';

const inputClass =
  'w-full px-3 py-2 border border-rule rounded text-sm text-ink bg-paper placeholder:text-ink-soft focus:outline-none focus:border-ink';

export default function AddArticlePage() {
  const { key, role } = useAdmin();
  const router = useRouter();
  const [form, setForm] = useState({ headline: '', body: '', image: '', category: 'politics', source: '' });
  const [priority, setPriority] = useState('normal');
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [insertingImage, setInsertingImage] = useState(false);
  const [preview, setPreview] = useState(null);
  const bodyRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url } = await uploadImage(key, file);
      setForm((f) => ({ ...f, image: url }));
    } catch {
      alert('Image upload failed — you can still paste a URL directly below.');
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  }

  // Lets the admin drop extra images anywhere inside the body — uploads the
  // file, then inserts a [[img:url]] token at wherever the cursor currently
  // sits in the body textarea. The article page renders these as real
  // inline images at that exact spot.
  async function handleInsertImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setInsertingImage(true);
    try {
      const { url } = await uploadImage(key, file);
      const textarea = bodyRef.current;
      const token = `\n[[img:${url}]]\n`;
      if (textarea) {
        const start = textarea.selectionStart ?? form.body.length;
        const end = textarea.selectionEnd ?? form.body.length;
        const nextBody = form.body.slice(0, start) + token + form.body.slice(end);
        setForm((f) => ({ ...f, body: nextBody }));
        // Restore focus + cursor just after the inserted token on next render.
        requestAnimationFrame(() => {
          textarea.focus();
          const pos = start + token.length;
          textarea.setSelectionRange(pos, pos);
        });
      } else {
        setForm((f) => ({ ...f, body: f.body + token }));
      }
    } catch {
      alert('Image upload failed.');
    } finally {
      setInsertingImage(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createArticle(key, {
        ...form,
        origin: role === 'editor' ? 'editor' : 'admin',
        priority,
        notify: role === 'admin' ? notify : false,
      });
      setForm({ headline: '', body: '', image: '', category: 'politics', source: '' });
      setPreview(null);
      setNotify(false);
      router.push('/admin/articles');
    } catch {
      alert('Failed to save — check all fields are filled in.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <h1 className="font-serif text-lg font-semibold text-ink mb-2">Write New Article</h1>

      <input
        required
        placeholder="Headline"
        value={form.headline}
        onChange={(e) => setForm({ ...form, headline: e.target.value })}
        className={inputClass}
      />

      <div>
        <textarea
          ref={bodyRef}
          required
          placeholder="Full article body"
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={10}
          className={inputClass}
        />
        <label className="mt-1.5 flex items-center justify-center gap-2 w-full py-2 border border-dashed border-rule rounded text-xs text-ink-soft cursor-pointer hover:bg-rule/20">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {insertingImage ? 'Uploading...' : 'Insert an image at cursor position'}
          <input type="file" accept="image/*" onChange={handleInsertImage} disabled={insertingImage} className="hidden" />
        </label>
        <p className="text-[11px] text-ink-soft mt-1">
          Tap into the body text where you want the image, then use this button — it drops the image right there.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">Cover image</label>

        {preview && (
          <div className="relative w-full aspect-video bg-rule rounded overflow-hidden mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-ink/60 flex items-center justify-center text-paper text-sm">
                Uploading...
              </div>
            )}
          </div>
        )}

        <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-rule rounded-lg text-sm text-ink-soft cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Click to upload cover image
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>

        <input
          placeholder="Or paste an image URL directly"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          className={`${inputClass} mt-2`}
        />
      </div>

      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        className={inputClass}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        placeholder="Byline (optional — defaults to Staff)"
        value={form.source}
        onChange={(e) => setForm({ ...form, source: e.target.value })}
        className={inputClass}
      />

      {role === 'admin' && (
        <div className="border border-rule rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Send push notification</span>
            <button
              type="button"
              onClick={() => setNotify((n) => !n)}
              className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${notify ? 'bg-accent' : 'bg-rule'}`}
              aria-pressed={notify}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-paper transition-transform ${notify ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>
          {notify && (
            <div>
              <label className="block text-xs font-medium text-ink-soft mb-1">Priority</label>
              <div className="flex gap-2">
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
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || uploading || !form.image}
        className="w-full py-2.5 bg-accent text-ink rounded-full text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Publishing...' : uploading ? 'Waiting for image...' : notify ? 'Publish & Notify' : 'Publish Article'}
      </button>
    </form>
  );
}
