'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { SparkleIcon } from '../../components/layout';
import { SafeImage } from '../../components/cards';
import { streamHeraldAI, getChatSessions, saveChatSession, deleteChatSession } from '../../lib/data';
import { getSettings } from '../../lib/settings';

function newSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFor(messages) {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return 'New chat';
  const t = firstUser.content.trim().replace(/\s+/g, ' ');
  return t.length > 48 ? t.slice(0, 48) + '…' : t;
}

// Slide-in drawer listing past chat sessions (stored in localStorage, no
// login needed) — opened from the hamburger icon, same idea as Claude's or
// ChatGPT's chat history sidebar.
function SessionsDrawer({ open, onClose, sessions, currentId, onSelect, onNew, onDelete }) {
  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/40 z-40 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 bottom-0 z-50 w-[82%] max-w-xs bg-paper border-r border-rule flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4 border-b border-rule">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-ink text-paper text-sm font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 && (
            <p className="text-center text-ink-soft text-xs py-8 px-4">Your past chats will show up here.</p>
          )}
          {sessions.map((s) => (
            <div key={s.id} className={`flex items-center group px-2 ${s.id === currentId ? 'bg-rule/30' : ''}`}>
              <button onClick={() => onSelect(s.id)} className="flex-1 min-w-0 text-left px-2.5 py-2.5 rounded-lg hover:bg-rule/30">
                <p className="text-sm text-ink truncate">{s.title}</p>
              </button>
              <button
                onClick={() => onDelete(s.id)}
                aria-label="Delete chat"
                className="w-8 h-8 shrink-0 flex items-center justify-center text-ink-soft opacity-0 group-hover:opacity-100 active:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const SUGGESTIONS = [
  "What's happening in the news today?",
  'Find Herald articles about Nigeria',
  "Search the web for today's weather in Lagos",
  'Help me draft a message',
];

function Avatar({ you }) {
  if (you) {
    return (
      <div className="w-7 h-7 rounded-full bg-rule flex items-center justify-center shrink-0 text-xs font-semibold text-ink-soft">
        You
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
      <SparkleIcon size={14} />
    </div>
  );
}

// Matches the search page's citation treatment: [2] in the reply text
// becomes a tappable chip that jumps to the matching numbered card below.
function linkifyCitations(text, idPrefix) {
  if (!text) return text;
  return text.replace(/\[(\d+)\](?!\()/g, (match, n) => `[${match}](#${idPrefix}-${n})`);
}

function CitationLink({ href, children }) {
  if (href?.startsWith('#')) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById(href.slice(1));
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-accent');
          setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 1200);
        }}
        className="inline-flex items-center justify-center min-w-[1.1em] px-1 rounded bg-accent/25 text-accent-dark text-[11px] font-semibold no-underline align-super"
      >
        {children}
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal underline underline-offset-2">
      {children}
    </a>
  );
}

function WebResultsCard({ results, idPrefix }) {
  if (!results?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {results.map((r, i) => (
        <a
          key={i}
          id={idPrefix ? `${idPrefix}-${i + 1}` : undefined}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-paper border border-rule rounded-lg px-3 py-2 hover:bg-rule/20 scroll-mt-20 transition-shadow"
        >
          <p className="text-xs text-teal font-medium truncate">{r.url}</p>
          <p className="text-sm text-ink font-medium line-clamp-1">{r.title}</p>
        </a>
      ))}
    </div>
  );
}

function HeraldResultsCard({ articles }) {
  if (!articles?.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      {articles.map((a) => (
        <Link
          key={a._id}
          href={`/article/${a._id}`}
          className="flex items-center gap-2.5 bg-paper border border-rule rounded-lg px-2.5 py-2 hover:bg-rule/20"
        >
          <div className="relative w-10 h-10 shrink-0 rounded overflow-hidden bg-rule">
            <SafeImage src={a.image} fill sizes="40px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-teal font-medium">{a.source}</p>
            <p className="text-sm text-ink font-medium line-clamp-1">{a.headline}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function LikedCard({ headline, likes }) {
  return (
    <div className="mt-2 flex items-center gap-2 bg-paper border border-rule rounded-lg px-3 py-2 text-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-accent-dark shrink-0">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
      <span className="text-ink">
        Liked <span className="font-medium">{headline}</span> · {likes} likes
      </span>
    </div>
  );
}

function LikedManyCard({ articles }) {
  if (!articles?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {articles.map((a, i) => (
        <div key={i} className="flex items-center gap-2 bg-paper border border-rule rounded-lg px-3 py-1.5 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-accent-dark shrink-0">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span className="text-ink truncate">
            {a.headline} · {a.likes} likes
          </span>
        </div>
      ))}
    </div>
  );
}

function Attachments({ items, idPrefix }) {
  if (!items?.length) return null;
  // Only one web_results attachment per message in practice, so the
  // citation prefix can point straight at it without a sub-index.
  return (
    <>
      {items.map((a, i) => {
        if (a.type === 'web_results') return <WebResultsCard key={i} results={a.results} idPrefix={idPrefix} />;
        if (a.type === 'herald_results') return <HeraldResultsCard key={i} articles={a.articles} />;
        if (a.type === 'liked') return <LikedCard key={i} headline={a.headline} likes={a.likes} />;
        if (a.type === 'liked_many') return <LikedManyCard key={i} articles={a.articles} />;
        return null;
      })}
    </>
  );
}

// User turns stay a right-aligned bubble (clearly "what I typed"); assistant
// turns drop the bubble entirely and just flow as text under the avatar —
// the roomy, bubble-less layout modern chat assistants use, so a long reply
// reads like an article rather than a cramped speech-bubble.
function Bubble({ role, content, attachments, index }) {
  const you = role === 'user';
  const idPrefix = `msg-${index}-result`;

  if (you) {
    return (
      <div className="flex justify-end px-4 py-2 min-w-0">
        <div className="max-w-[85%] min-w-0 rounded-2xl rounded-tr-sm bg-ink text-paper px-4 py-2.5 text-sm leading-relaxed break-words">
          <p className="whitespace-pre-line break-words">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-4 min-w-0">
      <Avatar you={false} />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="md-body text-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: CitationLink }}>
            {linkifyCitations(content, idPrefix)}
          </ReactMarkdown>
        </div>
        <Attachments items={attachments} idPrefix={idPrefix} />
      </div>
    </div>
  );
}

function TypingIndicator({ status }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar you={false} />
      <div className="flex items-center gap-2 text-sm text-ink-soft">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-ink-soft animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        {status && <span>{status}</span>}
      </div>
    </div>
  );
}

export default function HeraldAIPage() {
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [appHeight, setAppHeight] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [status, setStatus] = useState(''); // "Searching the web…" while a tool runs
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const sessionIdRef = useRef(null);
  const loadingRef = useRef(false);
  const abortRef = useRef(null);
  const stickRef = useRef(true); // keep following the reply unless the reader scrolls up

  // This screen is a fixed-height app shell (top bar / scrolling messages /
  // composer), not a long scrolling page — that is what made the old one
  // feel lanky: the bar and the composer lived at the two ends of a tall
  // document, so you had to scroll to reach either. The height follows the
  // visual viewport so the composer stays right above the on-screen
  // keyboard, and the bottom nav is hidden while the keyboard is up.
  useEffect(() => {
    const vv = window.visualViewport;
    let maxH = window.innerHeight;
    function update() {
      const h = vv ? vv.height : window.innerHeight;
      if (h > maxH) maxH = h;
      const kb = h < maxH - 150;
      setAppHeight(h);
      setKeyboardOpen(kb);
      document.documentElement.dataset.kb = kb ? 'open' : '';
    }
    function resetBase() {
      maxH = window.innerHeight;
      update();
    }
    update();
    vv?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', resetBase);
    return () => {
      vv?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', resetBase);
      delete document.documentElement.dataset.kb;
    };
  }, []);

  // On first load: resume the most recent chat if one exists, otherwise
  // start fresh (unsaved until the first message is sent). If we arrived from
  // the Search page's AI Overview ("Continue in Herald AI" / follow-up box),
  // /ai?q=… starts a brand-new chat and asks that straight away.
  useEffect(() => {
    const existing = getChatSessions();
    setSessions(existing);

    const params = new URLSearchParams(window.location.search);
    const incoming = (params.get('q') || '').trim();
    if (incoming) {
      const ctx = (params.get('ctx') || '').trim();
      window.history.replaceState(null, '', '/ai');
      const id = newSessionId();
      sessionIdRef.current = id;
      setSessionId(id);
      sendWith([], ctx ? `Regarding my search "${ctx}": ${incoming}` : incoming);
      return;
    }

    if (existing.length > 0) {
      sessionIdRef.current = existing[0].id;
      setSessionId(existing[0].id);
      setMessages(existing[0].messages);
    } else {
      const id = newSessionId();
      sessionIdRef.current = id;
      setSessionId(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    if (stickRef.current || last?.role === 'user') {
      el.scrollTo({ top: el.scrollHeight, behavior: loading ? 'auto' : 'smooth' });
    }
  }, [messages, loading, appHeight, status]);

  function onMessagesScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }

  function persist(nextMessages) {
    const id = sessionIdRef.current;
    if (!id || nextMessages.length === 0) return;
    if (!getSettings().saveChats) return; // "Save chat history" is off in Settings
    const clean = nextMessages.map(({ role, content, attachments }) => ({ role, content, attachments }));
    saveChatSession({ id, title: titleFor(clean), messages: clean });
    setSessions(getChatSessions());
  }

  // Sends `text` after the messages in `base`, streaming the reply in as it
  // is written. Partial replies are kept if the request fails or is stopped.
  async function sendWith(base, text) {
    const content = text.trim();
    if (!content || loadingRef.current) return;
    setError('');
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    stickRef.current = true;

    const next = [...base, { role: 'user', content }];
    const draft = { role: 'assistant', content: '', attachments: [], streaming: true };
    setMessages([...next, draft]);
    persist(next);
    loadingRef.current = true;
    setLoading(true);
    setStatus('');

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = '';
    const atts = [];
    let timer = null;
    const flush = () => {
      timer = null;
      setMessages([...next, { ...draft, content: acc, attachments: [...atts] }]);
    };
    const schedule = () => {
      if (!timer) timer = setTimeout(flush, 40); // batch token updates
    };

    let failure = null;
    try {
      await streamHeraldAI(next.map(({ role, content: c }) => ({ role, content: c })), {
        signal: ctrl.signal,
        onDelta: (t) => {
          acc += t;
          setStatus('');
          schedule();
        },
        onAttachment: (a) => {
          atts.push(a);
          schedule();
        },
        onStatus: (t) => setStatus(t),
      });
    } catch (err) {
      if (err.name !== 'AbortError') failure = err;
    }
    if (timer) clearTimeout(timer);

    if (acc || atts.length > 0) {
      const finalMessages = [...next, { role: 'assistant', content: acc, attachments: atts }];
      setMessages(finalMessages);
      persist(finalMessages);
    } else {
      setMessages(next);
    }
    if (failure) setError(failure.message || 'Herald AI is unavailable right now.');
    abortRef.current = null;
    loadingRef.current = false;
    setLoading(false);
    setStatus('');
  }

  function send(text) {
    return sendWith(messages, text);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  function startNewChat() {
    stop();
    const id = newSessionId();
    sessionIdRef.current = id;
    setSessionId(id);
    setMessages([]);
    setError('');
    setDrawerOpen(false);
  }

  function selectSession(id) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    stop();
    sessionIdRef.current = id;
    setSessionId(id);
    setMessages(session.messages);
    setError('');
    setDrawerOpen(false);
  }

  function removeSession(id) {
    deleteChatSession(id);
    const remaining = getChatSessions();
    setSessions(remaining);
    if (id === sessionId) {
      if (remaining.length > 0) {
        sessionIdRef.current = remaining[0].id;
        setSessionId(remaining[0].id);
        setMessages(remaining[0].messages);
      } else {
        startNewChat();
      }
    }
  }

  const empty = messages.length === 0;

  return (
    <main
      className="fixed inset-x-0 top-0 flex flex-col bg-paper"
      style={{ height: appHeight ? `${appHeight}px` : '100dvh' }}
    >
      <SessionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        currentId={sessionId}
        onSelect={selectSession}
        onNew={startNewChat}
        onDelete={removeSession}
      />

      {/* Top bar — always visible */}
      <div className="shrink-0 h-14 px-2 flex items-center justify-between border-b border-rule bg-paper">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Chat history"
          className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-rule/40 active:bg-rule/60"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <div className="flex items-center gap-1.5">
          <SparkleIcon size={16} className="text-accent-dark" />
          <h1 className="font-serif text-lg font-semibold text-ink">Herald AI</h1>
        </div>
        <button
          onClick={startNewChat}
          aria-label="New chat"
          className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-rule/40 active:bg-rule/60"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      </div>

      {/* Messages — the only part that scrolls */}
      <div ref={scrollRef} onScroll={onMessagesScroll} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className={`mx-auto w-full max-w-2xl ${empty ? 'min-h-full flex flex-col justify-center' : 'pt-2 pb-4'}`}>
          {empty && (
            <div className="px-5 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-ink text-paper flex items-center justify-center mx-auto mb-4">
                <SparkleIcon size={24} />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-ink text-center mb-1">How can I help?</h2>
              <p className="text-center text-ink-soft text-sm mb-6">
                Ask about the news, search the web, or anything else.
              </p>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left px-4 py-3 border border-rule hover:bg-rule/30 rounded-2xl text-sm text-ink transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.streaming && !m.content && !m.attachments?.length ? null : (
              <Bubble key={i} index={i} role={m.role} content={m.content} attachments={m.attachments} />
            )
          )}
          {loading && !messages[messages.length - 1]?.content && <TypingIndicator status={status} />}
          {loading && messages[messages.length - 1]?.content && status && (
            <p className="px-4 pl-14 pb-2 text-xs text-ink-soft">{status}</p>
          )}
          {error && <p className="text-center text-red-600 text-xs px-4 py-2">{error}</p>}
        </div>
      </div>

      {/* Composer — pinned above the keyboard / bottom nav */}
      <div
        className="shrink-0 bg-paper px-3 pt-2"
        style={{
          paddingBottom: keyboardOpen ? '8px' : 'calc(4rem + env(safe-area-inset-bottom) + 8px)',
        }}
      >
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl flex items-end gap-2 rounded-3xl border border-rule bg-paper shadow-sm pl-4 pr-1.5 py-1.5 focus-within:border-ink-soft/50 transition-colors"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Message Herald AI"
            className="flex-1 resize-none max-h-[140px] bg-transparent text-ink placeholder:text-ink-soft text-[15px] leading-relaxed py-2 focus:outline-none"
          />
          {loading ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              className="w-9 h-9 mb-0.5 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center"
            >
              <span className="w-3 h-3 rounded-[3px] bg-paper" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="w-9 h-9 mb-0.5 shrink-0 rounded-full bg-ink text-paper flex items-center justify-center disabled:bg-rule disabled:text-ink-soft transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5" />
                <path d="m6 11 6-6 6 6" />
              </svg>
            </button>
          )}
        </form>
        {!keyboardOpen && (
          <p className="text-center text-[10px] text-ink-soft mt-1.5">Herald AI can make mistakes. Check important info.</p>
        )}
      </div>
    </main>
  );
}
