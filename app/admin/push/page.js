'use client';

import { useEffect, useState } from 'react';
import { useAdmin, Card, PageHeader, Spinner, useToast } from '../../../components/studio';
import { getPushStatus, sendTestPush, broadcastPush, listArticles } from '../../../lib/data';

export default function PushPage() {
  const { key, role } = useAdmin();
  const [status, setStatus] = useState(null);
  const [recent, setRecent] = useState([]);
  const [title, setTitle] = useState('');
  const [articleId, setArticleId] = useState('');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState('');
  const [toast, show] = useToast();

  useEffect(() => {
    if (role !== 'admin') return;
    getPushStatus(key).then(setStatus).catch(() => setStatus({ error: true }));
    listArticles(key, { status: 'published' }).then((d) => setRecent(d.articles.slice(0, 15))).catch(() => {});
  }, [key, role]);

  if (role !== 'admin') return <p className="text-center text-ink-soft py-20 text-sm">Admins only.</p>;

  function describe(push) {
    return `Sent to ${push.sent} of ${push.total} device(s)${push.removed ? ` · removed ${push.removed} dead` : ''}`;
  }

  async function test() {
    setBusy('test');
    try {
      const { push } = await sendTestPush(key);
      show(describe(push));
    } catch (err) {
      show('Failed: ' + err.message);
    } finally {
      setBusy('');
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!confirm(`Send "${title.trim()}" to every subscribed device?`)) return;
    setBusy('send');
    try {
      const { push } = await broadcastPush(key, { title: title.trim(), articleId: articleId || undefined, priority });
      show(describe(push));
      setTitle('');
    } catch (err) {
      show('Failed: ' + err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div>
      <PageHeader title="Push center" sub="Notifications to everyone who allowed them" />
      <div className="px-4 space-y-4">
        <Card className="p-4">
          {!status ? (
            <Spinner />
          ) : status.error ? (
            <p className="text-sm text-ink-soft">Couldn't load status — the server may be waking up.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-2xl font-semibold text-ink">{status.subscribers}</p>
                  <p className="text-xs text-ink-soft">subscribed device{status.subscribers === 1 ? '' : 's'}</p>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${status.vapidConfigured ? 'text-emerald-600' : 'text-red-600'}`}>
                    {status.vapidConfigured ? 'Keys set' : 'Keys missing'}
                  </p>
                  <p className="text-xs text-ink-soft">VAPID · auto-push {status.autoPush && status.autoPublish ? 'on' : 'off'}</p>
                </div>
              </div>
              {status.subscribers === 0 && (
                <p className="text-xs text-ink-soft mb-3">
                  0 devices means no phone has registered with the server yet. Open Herald once, allow notifications, then refresh this page.
                </p>
              )}
              <button onClick={test} disabled={busy === 'test' || !status.vapidConfigured} className="w-full py-2.5 rounded-full border border-rule text-sm font-semibold text-ink disabled:opacity-40">
                {busy === 'test' ? 'Sending…' : 'Send test notification'}
              </button>
            </>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-sm font-semibold text-ink mb-3">Send a notification</p>
          <form onSubmit={send} className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={140}
              placeholder="Message (shown as the headline)"
              className="w-full px-3.5 py-2.5 border border-rule rounded-xl text-sm text-ink bg-paper placeholder:text-ink-soft focus:outline-none focus:border-accent"
            />
            <select
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-rule rounded-xl text-sm text-ink bg-paper focus:outline-none focus:border-accent"
            >
              <option value="">No link — just open Herald</option>
              {recent.map((a) => (
                <option key={a._id} value={a._id}>{a.headline.slice(0, 70)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              {['normal', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${priority === p ? (p === 'high' ? 'bg-red-600 text-white' : 'bg-ink text-paper') : 'bg-rule/50 text-ink-soft'}`}
                >
                  {p === 'high' ? 'High (breaking)' : 'Normal'}
                </button>
              ))}
            </div>
            <button type="submit" disabled={busy === 'send' || !title.trim()} className="w-full py-2.5 rounded-full bg-accent text-white text-sm font-semibold disabled:opacity-40">
              {busy === 'send' ? 'Sending…' : 'Send to everyone'}
            </button>
          </form>
        </Card>
      </div>
      {toast}
    </div>
  );
}
