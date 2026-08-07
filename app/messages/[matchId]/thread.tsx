'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendMessage } from '@/lib/actions';
import { redactContacts } from '@/lib/guard-content';
import type { Message } from '@/lib/types';

export function Thread({ matchId, userId, initial, otherName }: {
  matchId: string; userId: string; initial: Message[]; otherName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initial);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [maskedNotice, setMaskedNotice] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        payload => {
          const msg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    // Show the sender their own message already masked, matching what the server
    // stores — so the bubble never briefly reveals a number the recipient won't see.
    const clean = redactContacts(body);
    const optimistic: Message = { id: `tmp-${Date.now()}`, match_id: matchId, sender_id: userId, body: clean, created_at: new Date().toISOString(), read_at: null };
    setMessages(prev => [...prev, optimistic]);
    const res = await sendMessage(matchId, body);
    if (res?.error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setDraft(body);
    } else if (res?.masked) {
      setMaskedNotice(true);
    }
    setSending(false);
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto py-4 space-y-2" role="log" aria-label={`Conversation with ${otherName}`}>
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted py-10">You matched — break the ice</p>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-sm ${m.sender_id === userId ? 'bg-foreground text-background rounded-br-lg' : 'bg-card border border-line rounded-bl-lg'}`}>
              {m.body}
              <span className={`block text-[10px] mt-0.5 ${m.sender_id === userId ? 'text-background/60' : 'text-muted'}`}>
                {new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {maskedNotice && (
        <p className="text-[11px] text-muted text-center pb-1" role="status">
          Contact details are hidden — keep the conversation on Co-op.
        </p>
      )}
      <form onSubmit={submit} className="flex gap-2 border-t border-line pt-3 pb-2 sticky bottom-0 bg-background">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Message ${otherName}…`}
          aria-label={`Message ${otherName}`}
          className="flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-sm focus:border-accent focus:outline-none" />
        <button disabled={!draft.trim() || sending} className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-85 disabled:opacity-40">Send</button>
      </form>
    </>
  );
}
