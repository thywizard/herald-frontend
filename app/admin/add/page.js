'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../../components/interactive';
import { createArticle, uploadImage, CATEGORIES } from '../../../lib/data';

export default function AddArticlePage() {
  const { key, role } = useAdmin();
  const router = useRouter();
  const [form, setForm] = useState({ headline: '', body: '', image: '', category: 'politics', source: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

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
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createArticle(key, { ...form, origin: role === 'editor' ? 'editor' : 'admin' });
      setForm({ headline: '', body: '', image: '', category: 'politics', source: '' });
      setPreview(null);
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
        className="w-full px-3 py-2 border border-rule rounded text-sm"
      />
      <textarea
        required
        placeholder="Full article body"
        value={form.body}
        onChange={(e) => setForm({ ...form, body: e.target.value })}
        rows={8}
        className="w-full px-3 py-2 border border-rule rounded text-sm"
      />

      <div>
        <label className="block text-xs font-medium text-ink-soft mb-1.5">Article image</label>

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
          Click to upload image
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>

        <input
          placeholder="Or paste an image URL directly"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          className="w-full px-3 py-2 border border-rule rounded text-sm mt-2"
        />
      </div>

      <select
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
        className="w-full px-3 py-2 border border-rule rounded text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        placeholder="Byline (optional — defaults to Staff)"
        value={form.source}
        onChange={(e) => setForm({ ...form, source: e.target.value })}
        className="w-full px-3 py-2 border border-rule rounded text-sm"
      />
      <button
        type="submit"
        disabled={saving || uploading || !form.image}
        className="w-full py-2.5 bg-accent text-ink rounded-full text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Publishing...' : uploading ? 'Waiting for image...' : 'Publish Article'}
      </button>
    </form>
  );
}
