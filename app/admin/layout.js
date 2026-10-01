'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminGate, useAdmin } from '../../components/interactive';

const ADMIN_TABS = [
  { href: '/admin', label: 'Overview', adminOnly: true },
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/add', label: 'Add Article' },
  { href: '/admin/logs', label: 'Ingest Logs', adminOnly: true },
];

function AdminChrome({ children }) {
  const { role, logout } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const tabs = ADMIN_TABS.filter((t) => !t.adminOnly || role === 'admin');

  // Editors have no Overview/Logs access — send them straight to Articles
  // instead of showing an empty/broken Overview page at the base /admin URL.
  useEffect(() => {
    if (role === 'editor' && pathname === '/admin') {
      router.replace('/admin/articles');
    }
  }, [role, pathname, router]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-20 bg-ink text-paper">
        <div className="flex items-center justify-between px-4 h-12">
          <span className="font-serif font-semibold">Herald Admin</span>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 bg-paper/10 rounded-full capitalize">{role}</span>
            <button onClick={logout} className="text-xs text-paper/70">Logout</button>
          </div>
        </div>
        <div className="flex gap-1 px-2 overflow-x-auto no-scrollbar border-t border-paper/10">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 px-3 py-2.5 text-sm font-medium border-b-2 ${
                  active ? 'border-accent text-paper' : 'border-transparent text-paper/60'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="pb-16">{children}</div>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminGate>
      <AdminChrome>{children}</AdminChrome>
    </AdminGate>
  );
}
