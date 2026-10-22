'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdmin, Card, PageHeader, Ico, Spinner, useToast, timeAgo } from '../../../components/studio';
import { SafeImage } from '../../../components/cards';
import { getStats, listArticles, publishArticle, deleteArticle, getIngestLogs, getAiCheck } from '../../../lib/data';

// AI Desk: everything about the automatic (AI) side of Herald in one place —
// is the pipeline healthy, what did the last runs do, and the review queue of
// AI-written stories waiting for a human decision.
export default function AIDeskPage() {
  const { key, role } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [check, setCheck] = useState(null); // AI health check result
  const [checking, setChecking] = useState(false);
  const [toast, show] = useToast();

  async function runCheck() {
    setChecking(true);
    setCheck(null);
    try {
      setCheck(await getAiCheck(key));
    } catch (err) {
      setCheck({ failed: err.message });
    } finally {
      setChecking(false);
    }
  }

  // Plain-English hint for the most common provider errors.
  function hint(error = '') {
    if (/401|403|invalid api key|unauthorized/i.test(error)) return 'The API key is wrong or expired — check HERALD_AI_API_KEY.';
    if (/404|does not exist|not found|decommission|model_not_found/i.test(error)) return 'That model name does not exist for this provider — fix the model variable on Render.';
    if (/429|rate|quota/i.test(error)) return 'Rate-limited — the free quota is used up for now; it will recover.';
    if (/timeout/i.test(error)) return 'The provider took too long to answer.';
    return 'Check the provider dashboard and the model name.';
  }

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getStats(key).catch(() => null),
      listArticles(key, { status: 'pending', origin: 'ai' }).catch(() => ({ articles: [] })),
      getIngestLogs(key).catch(() => []),
    ])
      .then(([s, q, l]) => {
        setStats(s);
        setQueue(q.articles || []);
        setLogs((l || []).slice(0, 4));
      })
      .finally(() => setLoading(false));
  }, [key]);

  useEffect(() => {
    if (role === 'admin') load();
  }, [role, load]);

  if (role !== 'admin') return null;

  async function approve(a) {
    setBusyId(a._id);
    try {
      await publishArticle(key, a._id);
      setQueue((q) => q.filter((x) => x._id !== a._id));
      show('Published');
    } catch {
      show('Could not publish');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(a) {
    if (!confirm(`Delete "${a.headline}"?`)) return;
    setBusyId(a._id);
    try {
      await deleteArticle(key, a._id);
      setQueue((q) => q.filter((x) => x._id !== a._id));
      show('Deleted');
    } catch {
      show('Could not delete');
    } finally {
      setBusyId(null);
    }
  }

  const cfg = stats?.config;
  const last = stats?.lastIngest;

  return (
    <div>
      <PageHeader title="AI Desk" sub="The automatic side of Herald" />
      {loading && !stats ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Pipeline */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-ink">News pipeline</p>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                  last?.status === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : last ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-rule text-ink-soft'
                }`}
              >
                {last ? last.status : 'never run'}
              </span>
            </div>
            <p className="text-xs text-ink-soft mb-3">
              {last
                ? `Last run ${timeAgo(last.createdAt)} · +${last.added} added · ${last.failed} failed · by ${last.triggeredBy}`
                : 'No ingest has run yet.'}
            </p>
            <p className="text-xs text-ink-soft mb-3">
              New AI stories are{' '}
              <span className="font-medium text-ink">{cfg?.autoPublish ? 'published automatically' : 'held here for review'}</span>
              {cfg?.autoPublish ? (cfg.autoPush ? ', with up to a few push alerts a day.' : '.') : ' — approve them below.'}
            </p>
            <button
              onClick={() => router.push('/admin/logs?run=1')}
              className="w-full py-2.5 rounded-full bg-accent text-white text-sm font-semibold"
            >
              Run ingest now
            </button>
          </Card>

          {/* Review queue */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-semibold text-ink">Review queue</p>
              <span className="text-xs text-ink-soft">{queue.length} waiting</span>
            </div>
            {queue.length === 0 ? (
              <Card className="p-6 text-center">
                <Ico name="check" size={22} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-sm text-ink font-medium">Nothing to review</p>
                <p className="text-xs text-ink-soft mt-0.5">AI stories waiting for approval will appear here.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                {queue.map((a, i) => (
                  <div key={a._id} className={`flex gap-3 p-3.5 ${i > 0 ? 'border-t border-rule' : ''}`}>
                    <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-rule">
                      <SafeImage src={a.image} fill sizes="64px" className="object-cover" priority />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-ink-soft mb-0.5">{a.source} · {a.category} · {timeAgo(a.createdAt)}</p>
                      <p className="text-sm font-medium text-ink leading-snug line-clamp-2 mb-2">{a.headline}</p>
                      <div className="flex gap-1.5">
                        <button disabled={busyId === a._id} onClick={() => approve(a)} className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold disabled:opacity-50">Approve</button>
                        <Link href={`/admin/add?edit=${a._id}`} className="px-3 py-1 rounded-full border border-rule text-[11px] font-medium text-ink">Edit</Link>
                        <button disabled={busyId === a._id} onClick={() => reject(a)} className="px-3 py-1 rounded-full border border-red-300 text-red-600 text-[11px] font-medium disabled:opacity-50">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Services */}
          {cfg && (
            <Card className="p-4">
              <p className="text-sm font-semibold text-ink mb-2">AI services</p>
              {[
                ['Herald AI chat', cfg.aiChat, 'Set HERALD_AI_API_KEY on Render'],
                ['AI Overview in search', cfg.aiChat, 'Uses the same Herald AI key'],
                ['Web search engine', cfg.search, 'Set SEARXNG_URL on Render'],
              ].map(([label, ok, hint]) => (
                <div key={label} className="flex items-center gap-2 py-1.5">
                  <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-ink">{label}</span>
                  {!ok && <span className="text-xs text-ink-soft">· {hint}</span>}
                </div>
              ))}
              <p className="text-xs text-ink-soft mt-2">The editor also has an AI assistant (headlines, share line, summary, proofread, continue) — open Write to use it.</p>
            </Card>
          )}

          {/* AI health check */}
          <Card className="p-4">
            <p className="text-sm font-semibold text-ink mb-1">AI health check</p>
            <p className="text-xs text-ink-soft mb-3">Calls the AI models for real and shows exactly what comes back — use it when the AI Overview or Herald AI misbehaves.</p>
            <button onClick={runCheck} disabled={checking} className="w-full py-2.5 rounded-full border border-rule text-sm font-semibold text-ink disabled:opacity-50">
              {checking ? 'Testing…' : 'Run test'}
            </button>
            {check?.failed && <p className="text-xs text-red-600 mt-3">Could not run the test: {check.failed}</p>}
            {check && !check.failed && (
              <div className="mt-3 space-y-2 text-xs">
                {!check.configured ? (
                  <p className="text-red-600">HERALD_AI_API_KEY is not set on Render.</p>
                ) : (
                  <>
                    <p className="text-ink-soft">
                      Provider: <span className="text-ink">{check.provider}</span> · main model: <span className="text-ink">{check.mainModel}</span>
                      {check.fastModel && <> · fast model: <span className="text-ink">{check.fastModel}</span></>}
                    </p>
                    {check.tests.map((t) => (
                      <div key={t.model} className={`rounded-xl border p-3 ${t.ok ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-300 bg-red-500/5'}`}>
                        <p className="font-semibold text-ink break-all">{t.ok ? '✓' : '✗'} {t.model} <span className="font-normal text-ink-soft">· {t.ms}ms</span></p>
                        {!t.ok && (
                          <>
                            <p className="text-red-600 mt-1 break-words">{t.error}</p>
                            <p className="text-ink-soft mt-1">{hint(t.error)}</p>
                          </>
                        )}
                      </div>
                    ))}
                    {check.lastOverviewError && (
                      <p className="text-ink-soft break-words">Last overview error ({timeAgo(check.lastOverviewError.at)}): {check.lastOverviewError.message}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Recent runs */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-semibold text-ink">Recent runs</p>
              <Link href="/admin/logs" className="text-xs text-accent-dark font-medium">All logs</Link>
            </div>
            {logs.length === 0 && <p className="text-xs text-ink-soft px-4 pb-4">No runs recorded yet.</p>}
            {logs.map((l) => (
              <div key={l._id} className="px-4 py-2.5 border-t border-rule flex items-center justify-between">
                <span className="text-xs text-ink">+{l.added} added · {l.failed} failed</span>
                <span className="text-[11px] text-ink-soft">{timeAgo(l.createdAt)}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
      {toast}
    </div>
  );
}
