'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { ProjectMessage } from '@/app/lib/coredon-types';
import { sendMessageAsProvider, sendMessageAsClient } from '@/app/lib/coredon-actions';

const POLL_ACTIVE_MS  = 1000;   // while the tab is visible
const POLL_HIDDEN_MS  = 10000;  // while the tab is backgrounded

interface Props {
  projectId: string;
  messages: ProjectMessage[];
  side: 'provider' | 'client';
  senderName: string;
  token?: string;
  onRefresh?: () => void;
}

export default function ChatSection({ projectId, messages: initialMessages, side, senderName, token }: Props) {
  const [messages, setMessages] = useState<ProjectMessage[]>(initialMessages);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const url = token
        ? `/api/project-messages/${projectId}?token=${encodeURIComponent(token)}`
        : `/api/project-messages/${projectId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }, [projectId, token]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;

    function poll() {
      fetchMessages().finally(() => {
        const delay = document.visibilityState === 'hidden' ? POLL_HIDDEN_MS : POLL_ACTIVE_MS;
        timerId = setTimeout(poll, delay);
      });
    }

    function onVisible() {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerId);
        poll(); // catch up immediately when the user returns to the tab
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    timerId = setTimeout(poll, POLL_ACTIVE_MS);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchMessages]);

  useEffect(() => { setMessages(initialMessages); }, [initialMessages]);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sorted.length]);

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString('en-CA', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
    } catch { return iso; }
  }

  function handleSend() {
    const text = content.trim();
    if (!text) return;
    setError('');
    setContent('');

    // Optimistic: show the message instantly before the server confirms
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ProjectMessage = {
      id: tempId,
      project_id: projectId,
      sender: side,
      sender_name: senderName,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    startTransition(async () => {
      const res = side === 'provider'
        ? await sendMessageAsProvider(projectId, text)
        : await sendMessageAsClient(projectId, senderName, text);
      if (res.success) {
        await fetchMessages(); // replace optimistic with real DB row
        inputRef.current?.focus();
      } else {
        // Roll back the optimistic message and restore the input
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setContent(text);
        setError(res.error ?? 'Failed to send.');
      }
    });
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(99,102,241,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#6366F1',
        }}>
          {side === 'provider' ? (senderName || 'P').slice(0, 1).toUpperCase() : 'C'}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Project Chat</div>
          <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
            Active
          </div>
        </div>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: 'var(--text-muted)', background: 'var(--bg)',
          border: '1px solid var(--border-light)', borderRadius: 20, padding: '2px 9px',
        }}>
          {sorted.length} message{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Message list */}
      <div style={{
        height: 380,
        overflowY: 'auto',
        padding: '16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: 'var(--bg)',
      }}>
        {sorted.length === 0 && (
          <div style={{
            margin: 'auto', textAlign: 'center',
            fontSize: 13, color: 'var(--text-muted)',
          }}>
            No messages yet — start the conversation.
          </div>
        )}

        {sorted.map((msg, i) => {
          const isMe = msg.sender === side;
          const initial = (msg.sender_name || '?').slice(0, 1).toUpperCase();
          const prevMsg = sorted[i - 1];
          const nextMsg = sorted[i + 1];
          const isFirstInGroup = !prevMsg || prevMsg.sender !== msg.sender;
          const isLastInGroup = !nextMsg || nextMsg.sender !== msg.sender;

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 8,
                marginTop: isFirstInGroup && i > 0 ? 12 : 2,
              }}
            >
              {/* Avatar for received messages — visible only on last bubble in group */}
              {!isMe && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)',
                  visibility: isLastInGroup ? 'visible' : 'hidden',
                }}>
                  {initial}
                </div>
              )}

              {/* Bubble + meta */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                gap: 2, maxWidth: '68%',
              }}>
                {/* Sender name — first bubble in group, received only */}
                {isFirstInGroup && !isMe && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', paddingLeft: 4 }}>
                    {msg.sender_name}
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isMe
                    ? (isFirstInGroup ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                    : (isFirstInGroup ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: isMe ? 'var(--chat-sent)' : 'var(--surface)',
                  color: isMe ? 'var(--chat-sent-text)' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border-light)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}>
                  {msg.content}
                </div>

                {/* Timestamp — last bubble in group only */}
                {isLastInGroup && (
                  <div style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    paddingInline: 4,
                  }}>
                    {formatTime(msg.created_at)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border-light)',
        padding: '12px 14px',
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'var(--surface)',
      }}>
        <input
          ref={inputRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
          placeholder="Type message here..."
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 24,
            background: 'var(--bg)',
            border: '1px solid var(--border-light)',
            color: 'var(--text-primary)',
            fontSize: 13, fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={pending || !content.trim()}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: pending || !content.trim() ? 'var(--border)' : '#6366F1',
            border: 'none', cursor: pending || !content.trim() ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={pending || !content.trim() ? 'var(--text-muted)' : '#fff'}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {error && (
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: '#EF4444' }}>{error}</div>
      )}
    </div>
  );
}
