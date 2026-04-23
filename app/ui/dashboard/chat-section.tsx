'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { ProjectMessage } from '@/app/lib/coredon-types';
import { sendMessageAsProvider, sendMessageAsClient } from '@/app/lib/coredon-actions';

interface Props {
  projectId: string;
  messages: ProjectMessage[];
  side: 'provider' | 'client';
  senderName: string;
  onRefresh: () => void;
}

export default function ChatSection({ projectId, messages, side, senderName, onRefresh }: Props) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

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
    startTransition(async () => {
      const res = side === 'provider'
        ? await sendMessageAsProvider(projectId, text)
        : await sendMessageAsClient(projectId, senderName, text);
      if (res.success) {
        setContent('');
        onRefresh();
      } else {
        setError(res.error ?? 'Failed to send.');
      }
    });
  }

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-light)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(99,102,241,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Project Chat</div>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: 'var(--text-muted)',
          background: 'var(--bg)', border: '1px solid var(--border-light)',
          borderRadius: 20, padding: '2px 9px',
        }}>
          {sorted.length} message{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: 340, overflowY: 'auto',
        padding: sorted.length === 0 ? '24px 20px' : '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No messages yet — start the conversation.
          </div>
        )}
        {sorted.map(msg => {
          const isMe = msg.sender === side;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isMe ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: isMe ? '#6366F1' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: isMe ? '#fff' : 'var(--text-secondary)',
              }}>
                {(msg.sender_name || '?').slice(0, 1).toUpperCase()}
              </div>

              {/* Bubble */}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', paddingInline: 4 }}>
                  {msg.sender_name} · {formatTime(msg.created_at)}
                </div>
                <div style={{
                  background: isMe ? '#6366F1' : 'var(--surface)',
                  color: isMe ? '#fff' : 'var(--text-primary)',
                  border: isMe ? 'none' : '1px solid var(--border-light)',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '10px 14px',
                  fontSize: 13, lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border-light)',
        padding: '12px 16px',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder="Send a message… (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10,
            background: 'var(--bg)', border: '1px solid var(--border-light)',
            color: 'var(--text-primary)', fontSize: 13,
            resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
          }}
        />
        <button
          onClick={handleSend}
          disabled={pending || !content.trim()}
          style={{
            flexShrink: 0, padding: '10px 18px', borderRadius: 10,
            background: pending || !content.trim() ? 'var(--border)' : '#6366F1',
            color: pending || !content.trim() ? 'var(--text-muted)' : '#fff',
            border: 'none', fontWeight: 700, fontSize: 13,
            cursor: pending || !content.trim() ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {pending ? '…' : 'Send'}
        </button>
      </div>
      {error && (
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: '#EF4444' }}>{error}</div>
      )}
    </div>
  );
}
