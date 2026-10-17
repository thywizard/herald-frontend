'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Header } from '../../components/layout';
import { heraldAIChat } from '../../lib/data';

const HISTORY_KEY = 'herald_ai_chat';

const SUGGESTIONS = [
  "What's happening in the news today?",
  'Explain a topic like I\'m five',
  'Help me draft a message',
  'Give me a quick summary of a complex idea',
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
    <div className="w-7 h-7 rounded-full bg-ink flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
        <path d="M8 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2" />
      </svg>
    </div>
  );
}

function Bubble({ role, content }) {
  const you = role === 'user';
  return (
    <div className={`flex gap-2.5 px-4 py-3 ${you ? 'flex-row-reverse' : ''}`}>
      <Avatar you={you} />
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          you ? 'bg-ink text-paper rounded-tr-sm' : 'bg-rule/40 text-ink rounded-tl-sm'
        }`}
      >
        {you ? (
          <p className="whitespace-pre-line">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:bg-ink prose-pre:text-paper prose-pre:rounded-lg prose-code:text-accent-dark">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 px-4 py-3">
      <Avatar you={false} />
      <div className="bg-rule/40 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-ink-soft animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function HeraldAIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
      if (Array.isArray(stored)) setMessages(stored);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text) {
    const content = text.trim();
    if (!content || loading) return;
    setError('');
    setInput('');
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);
    try {
      const reply = await heraldAIChat(next);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message || 'Herald AI is unavailable right now.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    send(input);
  }

  function clearChat() {
    if (!confirm('Clear this conversation?')) return;
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
  }

  return (
    <main className="min-h-screen bg-paper flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <Header />
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z" />
              <path d="M8 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2" />
            </svg>
          </div>
          <div>
            <h1 className="font-serif text-base font-semibold text-ink leading-none">Herald AI</h1>
            <p className="text-[11px] text-ink-soft mt-0.5">Ask it anything</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs text-ink-soft font-medium">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="px-4 pt-10 pb-4">
            <p className="text-center text-ink-soft text-sm mb-6">
              Herald AI is a full assistant — ask about the news, or anything else.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 bg-rule/30 hover:bg-rule/50 rounded-xl text-sm text-ink transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && <TypingIndicator />}
        {error && <p className="text-center text-red-600 text-xs px-4 py-2">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-paper border-t border-rule px-3 py-2.5 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Herald AI..."
          className="flex-1 px-4 py-2.5 bg-rule/40 text-ink placeholder:text-ink-soft rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="w-10 h-10 shrink-0 rounded-full bg-accent text-ink flex items-center justify-center disabled:opacity-40"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" />
          </svg>
        </button>
      </form>
    </main>
  );
}
