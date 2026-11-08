import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Ban, Check, LoaderCircle, MapPin, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ecoExchangeService, SALE_NOTICE } from '../services/ecoExchangeService';

const isLocationMessage = (body) => body?.startsWith('__EXACT_LOCATION__');
const parseLocation = (body) => {
  try { return JSON.parse(body.slice('__EXACT_LOCATION__'.length)); }
  catch { return null; }
};
const timeLabel = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('conversation');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [realtimeReady, setRealtimeReady] = useState(false);
  const bottomRef = useRef(null);
  const selected = useMemo(() => conversations.find((conversation) => conversation.id === selectedId), [conversations, selectedId]);
  const readOnly = !selected?.listing || ['UNAVAILABLE', 'COMPLETED'].includes(selected.listing.status);

  useEffect(() => {
    ecoExchangeService.markNotificationsRead().catch((requestError) => {
      console.error('[Messages] Unable to mark notifications as read:', requestError);
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { conversations: rows } = await ecoExchangeService.listConversations();
      setConversations(rows);
      const activeId = selectedId || rows[0]?.id;
      if (!selectedId && activeId) setSearchParams({ conversation: activeId }, { replace: true });
      setMessages(rows.find((conversation) => conversation.id === activeId)?.messages || []);
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }, [selectedId, setSearchParams]);

  useEffect(() => {
    let active = true;
    let channel;
    ecoExchangeService.setRealtimeUser(user.id).then(() => {
      if (!active || !selectedId) return;
      channel = ecoExchangeService.subscribeToMessages(selectedId, () => refresh(), (status) => {
        setRealtimeReady(status === 'SUBSCRIBED');
      });
    }).catch((requestError) => {
      if (active) setError(`Live updates are unavailable: ${requestError.message}`);
    });
    const timer = window.setInterval(() => refresh(), 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (channel) ecoExchangeService.removeChannel(channel);
      setRealtimeReady(false);
    };
  }, [refresh, selectedId, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!selected || !body || sending) return;
    setSending(true);
    setError('');
    try {
      const { message } = await ecoExchangeService.sendMessage(selected.id, body);
      setMessages((current) => [...current, message]);
      setText('');
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setSending(false); }
  };

  const shareExactLocation = async () => {
    try {
      await ecoExchangeService.shareExactLocation(selected.id);
      await refresh();
      setNotice('Your exact location was shared in this conversation.');
    } catch (requestError) { setError(requestError.message); }
  };

  const report = async () => {
    const reason = window.prompt('Tell our super admin why you are reporting this conversation:');
    if (!reason?.trim()) return;
    try {
      await ecoExchangeService.reportConversation(selected.id, reason);
      setNotice('Your report was sent to the Terra AI super admin.');
    } catch (requestError) { setError(requestError.message); }
  };

  const block = async () => {
    if (!window.confirm('Block this person? You will no longer be able to send messages or offers.')) return;
    try {
      await ecoExchangeService.blockConversationUser(selected.id);
      await refresh();
      setNotice('This person is blocked.');
    } catch (requestError) { setError(requestError.message); }
  };

  const unblock = async () => {
    try {
      await ecoExchangeService.unblockConversationUser(selected.id);
      await refresh();
      setNotice('This person is unblocked. You can message each other again.');
    } catch (requestError) { setError(requestError.message); }
  };

  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
    <h1 className="mb-5 text-2xl font-extrabold text-slate-900">Messages</h1>
    <aside className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Marketplace safety:</strong> {SALE_NOTICE}</aside>
    {notice && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="grid min-h-[65vh] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_1fr]">
      <aside className={`border-r border-slate-200 ${selectedId ? 'hidden md:block' : ''}`}>
        <h2 className="border-b border-slate-100 px-5 py-4 font-bold text-slate-800">Conversations</h2>
        {loading && <div className="p-5 text-sm text-slate-500"><LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />Loading conversations…</div>}
        {!loading && conversations.length === 0 && <p className="p-5 text-sm text-slate-500">No messages yet. Start a conversation from an eco listing.</p>}
        {conversations.map((conversation) => <button key={conversation.id} onClick={() => setSearchParams({ conversation: conversation.id })} className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left hover:bg-emerald-50 ${selectedId === conversation.id ? 'bg-emerald-50' : ''}`}>
          <img src={conversation.listing?.images?.[0]} alt="" className="h-12 w-12 rounded-xl bg-slate-100 object-cover" />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{conversation.other_user?.full_name || 'Terra member'}</span><span className="block truncate text-xs text-slate-500">{conversation.listing?.title || 'Listing unavailable'}</span><span className="block truncate text-xs text-slate-400">{conversation.messages.at(-1)?.body?.slice(0, 60) || 'No messages yet'}</span></span>
          {conversation.unread_count > 0 && <span className="rounded-full bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white">{conversation.unread_count}</span>}
        </button>)}
      </aside>
      <section className={`flex min-h-[65vh] flex-col ${selectedId ? '' : 'hidden md:flex'}`}>
        {!selected ? <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">Choose a conversation to view messages.</div> : <>
          <header className="flex items-center gap-3 border-b border-slate-100 p-4">
            <button onClick={() => setSearchParams({})} aria-label="Back to conversations" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><ArrowLeft className="h-4 w-4" /></button>
            <img src={selected.listing?.images?.[0]} alt="" className="h-11 w-11 rounded-xl bg-slate-100 object-cover" />
            <div className="min-w-0 flex-1"><h2 className="truncate font-bold">{selected.listing?.title}</h2><p className="text-xs text-slate-500">{selected.other_user?.full_name} · {selected.listing?.area_label}</p></div>
            <span className={`hidden text-xs ${realtimeReady ? 'text-emerald-700' : 'text-slate-400'} sm:block`}>{realtimeReady ? 'Live' : 'Connecting…'}</span>
            <button onClick={report} title="Report conversation" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><ShieldAlert className="h-4 w-4" /></button>
            {selected.blocked_by_me
              ? <button onClick={unblock} title="Unblock user" className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50">Unblock</button>
              : <button onClick={block} title="Block user" disabled={selected.blocked_me} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"><Ban className="h-4 w-4" /></button>}
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
            {messages.map((message) => {
              const own = message.sender_id === user.id;
              if (isLocationMessage(message.body)) {
                const location = parseLocation(message.body);
                return <div key={message.id} className={`max-w-sm rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm ${own ? 'ml-auto' : ''}`}>
                  <p className="flex items-center gap-2 text-sm font-bold text-emerald-900"><MapPin className="h-4 w-4" />Exact location shared</p>
                  {location && <><p className="mt-1 text-xs text-slate-600">{location.address}</p>{location.lat != null && location.lng != null && Number.isFinite(Number(location.lat)) && Number.isFinite(Number(location.lng)) && <a className="mt-2 inline-block text-xs font-bold text-emerald-700 underline" href={`https://www.google.com/maps?q=${location.lat},${location.lng}`} target="_blank" rel="noreferrer">Open map</a>}</>}
                  <p className="mt-2 text-right text-[10px] text-slate-400">{timeLabel(message.created_at)}</p>
                </div>;
              }
              return <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${own ? 'ml-auto bg-emerald-700 text-white' : 'bg-white text-slate-800'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? 'text-emerald-100' : 'text-slate-400'}`}>{timeLabel(message.created_at)}{own && message.read_at && <Check className="h-3 w-3" />}</p></div>;
            })}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-slate-100 p-3 sm:p-4">
            {(user.id === selected.owner_id || selected.has_accepted_offer) && <button onClick={shareExactLocation} disabled={readOnly} className="mb-2 inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 disabled:opacity-40"><MapPin className="h-3.5 w-3.5" />Share exact location</button>}
            <p className="mb-2 text-[11px] leading-relaxed text-amber-800">{SALE_NOTICE}</p>
            {selected.blocked_by_me ? <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800"><p>You blocked this person, so messaging and offers are disabled.</p><button type="button" onClick={unblock} className="mt-2 font-bold underline">Unblock this person</button></div>
              : selected.blocked_me ? <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">This person has blocked you, so you cannot send messages or offers.</p>
                : readOnly ? <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">This listing is not accepting new messages. Existing messages remain available.</p>
              : <form onSubmit={send} className="flex gap-2"><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={1} placeholder="Write a message…" className="max-h-28 min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" /><button disabled={sending || !text.trim()} aria-label="Send message" className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white disabled:opacity-50">{sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></form>}
          </div>
        </>}
      </section>
    </div>
  </main>;
}
