'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useAdmin } from '../../components/interactive';
import { getStats } from '../../lib/data';

function Card({ label, value, accent }) {
  return (
    <div className="border border-rule rounded-lg p-3">
      <p className={`text-2xl font-semibold ${accent ? 'text-accent-dark' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-ink-soft mt-0.5">{label}</p>
    </div>
  );
}

function timeAgo(dateString) {
  if (!dateString) return 'never';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OverviewPage() {
  const { key } = useAdmin();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats(key).then(setStats);
  }, [key]);

  if (!stats) return <p className="text-center text-ink-soft py-16">Loading...</p>;

  const { lastIngest } = stats;

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card label="Total articles" value={stats.total} />
        <Card label="Published" value={stats.published} />
        <Card label="Pending" value={stats.pending} />
        <Card label="Unpublished" value={stats.unpublished} />
        <Card label="Pinned" value={stats.pinned} accent />
        <Card
          label={`Last ingest — ${lastIngest ? lastIngest.status : 'never run'}`}
          value={timeAgo(lastIngest?.createdAt)}
        />
      </div>

      {lastIngest && (
        <div className="border border-rule rounded-lg p-3 mb-4 text-sm">
          <p className="font-medium text-ink mb-1">Last ingest run</p>
          <p className="text-ink-soft">
            {lastIngest.added} added · {lastIngest.failed} failed · {lastIngest.candidatesFound} candidates found
            {' · '}triggered by {lastIngest.triggeredBy}
          </p>
        </div>
      )}

      {stats.byCategory.length > 0 && (
        <div className="border border-rule rounded-lg p-3">
          <p className="font-medium text-ink text-sm mb-3">Published articles by category</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byCategory}>
              <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#D98E2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
