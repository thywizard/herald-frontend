'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Wraps next/image with a graceful fallback — never crashes the page and
// never shows a broken-image icon, regardless of what a source or an
// admin-entered URL gives us.
export function SafeImage({ src, alt = '', fill, sizes, className, priority }) {
  const [failed, setFailed] = useState(false);
  const valid = isValidImageUrl(src) && !failed;

  if (!valid) {
    return (
      <div className={`${className} ${fill ? 'absolute inset-0' : ''} bg-rule flex items-center justify-center`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-soft/50">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

function useLiveTimeAgo(dateString) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function LeadStory({ article }) {
  return (
    <Link href={`/article/${article._id}`} className="block group">
      <div className="relative w-full aspect-[4/3] bg-rule overflow-hidden">
        <SafeImage src={article.image} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent px-4 pt-16 pb-4 pointer-events-none">
          <span className="inline-block text-accent text-xs font-bold uppercase tracking-wide mb-2">
            {article.category}
          </span>
          <h1 className="font-serif text-2xl leading-tight text-paper font-semibold group-hover:underline underline-offset-2">
            {article.headline}
          </h1>
        </div>
      </div>
    </Link>
  );
}

export function ArticleRow({ article }) {
  const time = useLiveTimeAgo(article.createdAt);
  return (
    <div className="flex gap-3 py-4 px-4 border-b border-rule group">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-soft mb-1">
          <Link
            href={`/source/${encodeURIComponent(article.source)}`}
            className="font-medium text-teal hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {article.source}
          </Link>
          {' · '}
          {time}
        </p>
        <Link href={`/article/${article._id}`}>
          <h2 className="font-serif text-lg leading-snug font-medium text-ink group-hover:underline underline-offset-2">
            {article.headline}
          </h2>
        </Link>
      </div>
      <Link href={`/article/${article._id}`} className="relative w-24 h-24 shrink-0 overflow-hidden">
        <SafeImage src={article.image} sizes="96px" fill className="object-cover" />
      </Link>
    </div>
  );
}

export function ArticleRowSkeleton() {
  return (
    <div className="flex gap-3 py-4 px-4 border-b border-rule animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="h-3 w-24 bg-rule rounded mb-2" />
        <div className="h-4 w-full bg-rule rounded mb-1.5" />
        <div className="h-4 w-2/3 bg-rule rounded" />
      </div>
      <div className="w-24 h-24 shrink-0 bg-rule rounded" />
    </div>
  );
}
