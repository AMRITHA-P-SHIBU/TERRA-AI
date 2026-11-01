import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Clock3, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { getPostRequests, reviewPost } from '../services/profileService';

export default function PostRequestsPanel() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPosts(await getPostRequests());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getPostRequests()
      .then((requests) => { if (active) setPosts(requests); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const decide = async (postId, action, remarks = '') => {
    setActionId(postId);
    setError('');
    try {
      await reviewPost(postId, action, remarks);
      setNotice(action === 'APPROVED' ? 'Post approved.' : 'Post rejected.');
      setRejecting(null);
      setReason('');
      await load();
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setActionId(null);
    }
  };

  const submitReject = (event) => {
    event.preventDefault();
    if (!rejecting || !reason.trim()) return;
    decide(rejecting.id, 'REJECTED', reason.trim());
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Post Requests</h2>
          <p className="mt-1 text-sm text-slate-500">Review only the pending posts assigned to your account.</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>
      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}<button onClick={() => setNotice('')} className="float-right"><X className="h-4 w-4" /></button></div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-200" />)}</div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-5 py-14 text-center">
          <Check className="mx-auto mb-2 h-9 w-9 text-emerald-500" />
          <h3 className="font-bold text-slate-800">No pending post requests</h3>
          <p className="mt-1 text-sm text-slate-500">New requests assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex aspect-video items-center justify-center bg-slate-950">
                {post.media_type === 'video' ? <video src={post.media_url} controls playsInline className="h-full w-full object-contain" /> : <img src={post.media_url} alt={post.caption || 'Post preview'} className="h-full w-full object-contain" />}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{post.author_name}</p>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3" />{new Date(post.created_at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">PENDING</span>
                </div>
                <p className="max-h-24 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-700">{post.caption || <span className="italic text-slate-400">No caption</span>}</p>
                {rejecting?.id === post.id ? (
                  <form onSubmit={submitReject} className="space-y-2 border-t border-slate-100 pt-3">
                    <label className="block text-xs font-bold text-slate-700">Rejection reason (required)</label>
                    <textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:border-rose-400 focus:outline-none" />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setRejecting(null); setReason(''); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600">Cancel</button>
                      <button disabled={!reason.trim() || actionId === post.id} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                        {actionId === post.id && <LoaderCircle className="h-4 w-4 animate-spin" />}Confirm rejection
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <button disabled={actionId === post.id} onClick={() => decide(post.id, 'APPROVED')} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                      {actionId === post.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Approve
                    </button>
                    <button disabled={actionId === post.id} onClick={() => { setRejecting(post); setReason(''); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                      <X className="h-4 w-4" />Reject
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
