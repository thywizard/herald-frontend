'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAdmin } from '../../../components/interactive';
import { getIngestLogs, runIngestNow } from '../../../lib/data';

function formatDuration(ms) {
  if (!ms) return '—';
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(status) {
  if (status === 'success') return 'text-teal';
  if (status === 'partial') return 'text-accent-dark';
  return 'text-red-600';
}

export default function LogsPage() {
  const { key } = useAdmin();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggerState, setTriggerState] = useState('idle'); // idle | running | done | stalled
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    return getIngestLogs(key).then((data) => {
      setLogs(data);
      return data;
    }).finally(() => setLoading(false));
  }, [key]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  async function handleTrigger() {
    setTriggerState('running');
    setResult(null);
    setElapsed(0);
    const triggeredAt = Date.now();

    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    try {
      await runIngestNow('manual');
    } catch {
      // ignore — it's fire-and-forget on the backend, polling below is what matters
    }

    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      const data = await load();
      const fresh = data.find((log) => new Date(log.createdAt).getTime() > triggeredAt);

      if (fresh) {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setResult(fresh);
        setTriggerState('done');
      } else if (attempts > 45) { // ~3 minutes at 4s intervals
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setTriggerState('stalled');
      }
    }, 4000);
  }

  return (
    <div className="p-4">
      <div className="border border-rule rounded-xl p-4 mb-4">
        {triggerState === 'idle' && (
          <button onClick={handleTrigger} className="w-full py-2.5 bg-accent text-ink rounded-full text-sm font-semibold">
            ⚡ Trigger Fetch Now
          </button>
        )}

        {triggerState === 'running' && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-ink">Fetching and rewriting articles...</p>
              <p className="text-xs text-ink-soft">{elapsed}s elapsed — Gemini and Groq working in parallel</p>
            </div>
          </div>
        )}

        {triggerState === 'done' && result && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B3A4B" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <p className="text-sm font-semibold text-teal">Run complete</p>
            </div>
            <p className="text-sm text-ink">
              +{result.added} added · {result.candidatesFound} found · {result.failed} failed · {formatDuration(result.durationMs)}
            </p>
            <button onClick={() => setTriggerState('idle')} className="text-xs text-ink-soft underline mt-2">
              Trigger another
            </button>
          </div>
        )}

        {triggerState === 'stalled' && (
          <div>
            <p className="text-sm text-ink">Still running in the background — this can take a few minutes on a big batch.</p>
            <button onClick={load} className="text-xs text-teal underline mt-2">Check logs now</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-lg font-semibold text-ink">Ingest History</h1>
        <button onClick={load} className="text-xs text-teal underline">Refresh</button>
      </div>

      {loading && logs.length === 0 && <p className="text-center text-ink-soft py-16">Loading...</p>}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log._id} className="border border-rule rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase ${statusColor(log.status)}`}>{log.status}</span>
              <span className="text-xs text-ink-soft">{new Date(log.createdAt).toLocaleString()}</span>
            </div>
            <p className="text-sm text-ink">
              +{log.added} added · {log.candidatesFound} found · {log.failed} failed
            </p>
            <p className="text-xs text-ink-soft mt-1">
              {formatDuration(log.durationMs)} · triggered by {log.triggeredBy}
            </p>
            {log.errorSummary && <p className="text-xs text-red-600 mt-1">{log.errorSummary}</p>}
          </div>
        ))}
      </div>

      {!loading && logs.length === 0 && (
        <p className="text-center text-ink-soft py-16">No ingest runs recorded yet.</p>
      )}
    </div>
  );
}
