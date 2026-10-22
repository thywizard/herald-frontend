'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAdmin, Card, Stat, PageHeader, Ico, Spinner, useToast, timeAgo } from '../../components/studio';
import { getStats, runIngestNow, sendTestPush } from '../../lib/data';

function last7Days(daily = []) {
  const map = Object.fromEntries(daily.map((d) => [d.day, d.count]));
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: d.toLocaleDateString('en-GB', { weekday: 'short' }), count: map[key] || 0 });
  }
  return out;
}

const fmt = (n) => (n ?? 0).toLocaleString('en-GB');

function StatusDot({ ok, label, hint }) {
  return (
    <div className="flex items-center gap-2 py-1.5" title={hint}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
      <span className="text-sm text-ink">{label}</span>
      {!ok && hint && <span className="text-xs text-ink-soft truncate">· {hint}</span>}
    </div>
  );
}

function InstallBanner() {
  const { canInstall, install } = useAdmin();
  const [hidden, setHidden] = useState(false);
  if (!canInstall || hidden) return null;
  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-accent/10 border border-accent/30 px-4 py-3">
      <Ico name="download" size={20} className="text-accent-dark shrink-0" />
      <p className="flex-1 text-sm text-ink">Install Studio as its own app on this phone.</p>
      <button onClick={() => setHidden(true)} className="text-xs text-ink-soft">Later</button>
      <button onClick={install} className="text-xs font-semibold bg-accent text-white px-3 py-1.5 rounded-full">Install</button>
    </div>
  );
}

export default function Dashboard() {
  const { key, role } = useAdmin();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState('');
  const [toast, show] = useToast();

  const load = useCallback(() => {
    setError(false);
    getStats(key).then(setStats).catch(() => setError(true));
  }, [key]);

  useEffect(() => {
    if (role === 'admin') load();
  }, [role, load]);

  if (role !== 'admin') return null; // editors are redirected by the shell

  if (error) {
    return (
      <div className="text-center py-20 px-6">
        <p className="text-ink font-medium mb-1">Couldn't load the dashboard</p>
        <p className="text-ink-soft text-sm mb-4">The server may be waking up.</p>
        <button onClick={load} className="px-5 py-2 rounded-full bg-accent text-white text-sm font-semibold">Try again</button>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  const { lastIngest, engagement = {}, config, topArticles = [], byOrigin = [] } = stats;
  const originCount = (o) => byOrigin.find((x) => x.origin === o)?.count || 0;

  async function ingest() {
    setBusy('ingest');
    try {
      await runIngestNow('manual');
      show('Ingest started — check AI Desk for the result');
    } catch {
      show('Could not start the ingest');
    } finally {
      setBusy('');
    }
  }

  async function testPush() {
    setBusy('push');
    try {
      const { push } = await sendTestPush(key);
      show(`Test sent to ${push.sent} of ${push.total} device(s)`);
    } catch (err) {
      show('Push failed: ' + err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <PageHeader title="Dashboard" sub={`Last ingest ${lastIngest ? `${timeAgo(lastIngest.createdAt)} · ${lastIngest.status}` : 'never run'}`} />
      <InstallBanner />

      <div className="px-4 space-y-4 mt-1">
        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/admin/add" className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-accent text-white text-xs font-semibold active:scale-95 transition-transform">
            <Ico name="write" size={20} />
            Write
          </Link>
          <button onClick={ingest} disabled={busy === 'ingest'} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-rule text-ink text-xs font-semibold disabled:opacity-50 active:bg-rule/30">
            {busy === 'ingest' ? <Spinner /> : <Ico name="ai" size={20} className="text-accent-dark" />}
            Run ingest
          </button>
          <button onClick={testPush} disabled={busy === 'push'} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-rule text-ink text-xs font-semibold disabled:opacity-50 active:bg-rule/30">
            {busy === 'push' ? <Spinner /> : <Ico name="bell" size={20} className="text-accent-dark" />}
            Test push
          </button>
        </div>

        {/* Engagement */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon="articles" label="Published" value={fmt(stats.published)} />
          <Stat icon="eye" label="Total views" value={fmt(engagement.views)} />
          <Stat icon="heart" label="Likes" value={fmt(engagement.likes)} />
          <Stat icon="share" label="Shares" value={fmt(engagement.shares)} />
          <Stat icon="comments" label="Comments" value={fmt(engagement.comments)} />
          <Stat icon="bell" label="Push devices" value={fmt(stats.subscribers)} />
        </div>

        {(stats.pending > 0 || stats.unpublished > 0) && (
          <Link href="/admin/ai" className="flex items-center justify-between rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{stats.pending} waiting for review</p>
              <p className="text-xs text-ink-soft">{stats.unpublished} unpublished · tap to review the queue</p>
            </div>
            <Ico name="chevron" size={18} className="text-ink-soft" />
          </Link>
        )}

        {/* Publishing activity */}
        <Card className="p-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-semibold text-ink">Articles added, last 7 days</p>
            <p className="text-xs text-ink-soft">
              {originCount('ai')} AI · {originCount('editor') + originCount('admin')} staff
            </p>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={last7Days(stats.daily)}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
              <Bar dataKey="count" fill="#6366F1" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top stories */}
        {topArticles.length > 0 && (
          <Card className="overflow-hidden">
            <p className="text-sm font-semibold text-ink px-4 pt-4 pb-2">Top stories by views</p>
            {topArticles.map((a, i) => (
              <Link key={a._id} href={`/admin/add?edit=${a._id}`} className="flex items-start gap-3 px-4 py-3 border-t border-rule">
                <span className="w-5 font-serif text-lg text-ink-soft leading-6">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink leading-snug line-clamp-2">{a.headline}</span>
                  <span className="block text-xs text-ink-soft mt-0.5">
                    {fmt(a.views)} views · {fmt(a.likes)} likes · {a.category}
                  </span>
                </span>
              </Link>
            ))}
          </Card>
        )}

        {/* By category */}
        {stats.byCategory?.length > 0 && (
          <Card className="p-4">
            <p className="text-sm font-semibold text-ink mb-2">Published by category</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.byCategory}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={56} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} width={24} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar dataKey="count" fill="#818CF8" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* System health */}
        {config && (
          <Card className="px-4 py-3">
            <p className="text-sm font-semibold text-ink mb-1">System status</p>
            <StatusDot ok={config.autoPublish} label="Auto-publish AI articles" hint="set AUTO_PUBLISH=true on Render" />
            <StatusDot ok={config.autoPush && config.autoPublish} label="Auto push notifications" hint="needs auto-publish on" />
            <StatusDot ok={config.vapid} label="Push keys (VAPID)" hint="add VAPID keys on Render" />
            <StatusDot ok={config.aiChat} label="Herald AI + AI Overview" hint="add HERALD_AI_API_KEY" />
            <StatusDot ok={config.search} label="Web search engine" hint="add SEARXNG_URL" />
            <StatusDot ok={config.cloudinary} label="Image uploads (Cloudinary)" hint="add CLOUDINARY_URL" />
          </Card>
        )}
      </div>
      {toast}
    </div>
  );
}
