'use client';

import Link from 'next/link';
import { useAdmin, Card, PageHeader, Ico, StudioMark } from '../../../components/studio';

function Row({ href, icon, label, sub, onClick, external, danger, last }) {
  const inner = (
    <>
      <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-red-500/10 text-red-600' : 'bg-accent/10 text-accent-dark'}`}>
        <Ico name={icon} size={18} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-sm font-medium ${danger ? 'text-red-600' : 'text-ink'}`}>{label}</span>
        {sub && <span className="block text-xs text-ink-soft">{sub}</span>}
      </span>
      <Ico name={external ? 'external' : 'chevron'} size={16} className="text-ink-soft shrink-0" />
    </>
  );
  const cls = `flex items-center gap-3 px-4 py-3.5 active:bg-rule/30 ${last ? '' : 'border-b border-rule'}`;
  if (href) {
    return (
      <Link href={href} target={external ? '_blank' : undefined} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={`${cls} w-full`}>
      {inner}
    </button>
  );
}

export default function MorePage() {
  const { role, logout, canInstall, install } = useAdmin();
  const admin = role === 'admin';

  return (
    <div>
      <PageHeader title="More" />
      <div className="px-4 space-y-4">
        <Card className="p-4 flex items-center gap-3">
          <StudioMark size={44} />
          <div>
            <p className="font-serif text-lg font-semibold text-ink leading-tight">Herald Studio</p>
            <p className="text-xs text-ink-soft capitalize">Signed in as {role}</p>
          </div>
        </Card>

        {admin && (
          <Card className="overflow-hidden">
            <Row href="/admin/comments" icon="comments" label="Comments" sub="Moderate what readers post" />
            <Row href="/admin/push" icon="bell" label="Push center" sub="Test, broadcast, subscriber count" />
            <Row href="/admin/logs" icon="logs" label="Pipeline logs" sub="Every ingest run and its result" last />
          </Card>
        )}

        <Card className="overflow-hidden">
          {canInstall && <Row onClick={install} icon="download" label="Install Studio" sub="Add it to your home screen as its own app" />}
          <Row href="/" icon="external" label="Open Herald" sub="See the reader app" external last />
        </Card>

        <Card className="overflow-hidden">
          <Row onClick={logout} icon="logout" label="Sign out" danger last />
        </Card>
      </div>
    </div>
  );
}
