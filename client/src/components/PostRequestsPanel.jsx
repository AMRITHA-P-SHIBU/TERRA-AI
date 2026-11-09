import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Clock3,
  LoaderCircle,
  RefreshCw,
  X,
  Eye,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { getPostRequests, reviewPost } from '../services/profileService';

export default function PostRequestsPanel() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Preview Modal State
  const [previewPost, setPreviewPost] = useState(null);

  // Reject State
  const [rejectingPost, setRejectingPost] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const quickReasons = [
    'Image is unclear or blurry',
    'Duplicate or previously submitted action',
    'Does not demonstrate verified environmental impact',
    'Inappropriate or unrelated media content',
  ];

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
      .then((requests) => {
        if (active) setPosts(requests);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const decide = async (postId, action, remarks = '') => {
    setActionId(postId);
    setError('');
    try {
      await reviewPost(postId, action, remarks);
      setNotice(action === 'APPROVED' ? 'Post accepted successfully.' : 'Post rejected.');
      setRejectingPost(null);
      setRejectReason('');
      setPreviewPost(null);
      await load();
    } catch (decisionError) {
      setError(decisionError.message);
    } finally {
      setActionId(null);
    }
  };

  const handleOpenReject = (post) => {
    setRejectingPost(post);
    setRejectReason('');
  };

  const submitReject = (event) => {
    event.preventDefault();
    if (!rejectingPost || !rejectReason.trim()) return;
    decide(rejectingPost.id, 'REJECTED', rejectReason.trim());
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>GreenFeed Post Requests</span>
            {posts.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {posts.length} Pending
              </span>
            )}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Preview submitted sustainability posts in detail and accept or reject them.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm font-semibold text-emerald-800 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice('')} className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-3xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Check className="h-6 w-6 stroke-[3]" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No pending post requests</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            All submitted GreenFeed actions have been verified and processed. New submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => {
            return (
              <article
                key={post.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all duration-300"
              >
                <div>
                  {/* Media Thumbnail with Preview Overlay on Hover */}
                  <div
                    onClick={() => setPreviewPost(post)}
                    className="relative flex aspect-video items-center justify-center bg-slate-950 overflow-hidden cursor-pointer group/media"
                    title="Click to view full post"
                  >
                    {post.media_type === 'video' ? (
                      <video src={post.media_url} playsInline className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={post.media_url}
                        alt={post.caption || 'Post evidence'}
                        className="h-full w-full object-cover group-hover/media:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xs text-xs font-bold text-slate-900 shadow-md">
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>View Post</span>
                      </span>
                    </div>

                    <span className="absolute top-3 right-3 rounded-full bg-amber-500/90 backdrop-blur-xs text-white px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase shadow-xs">
                      Pending
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{post.author_name}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Clock3 className="h-3 w-3" />
                          <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Caption snippet */}
                    <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed font-normal">
                      {post.caption || <span className="italic text-slate-400">No caption provided.</span>}
                    </p>
                  </div>
                </div>

                {/* Primary Card Actions */}
                <div className="p-4 pt-0 space-y-2">
                  <button
                    onClick={() => setPreviewPost(post)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>View Post</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      disabled={actionId === post.id}
                      onClick={() => decide(post.id, 'APPROVED')}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Accept"
                    >
                      {actionId === post.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Accept</span>
                    </button>

                    <button
                      disabled={actionId === post.id}
                      onClick={() => handleOpenReject(post)}
                      className="flex-1 py-2 px-3 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Reject"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* 🔍 MODAL: FULL PREVIEW & DECISION MODAL                       */}
      {/* ============================================================ */}
      {previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Review Post Submission
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review submitted photo/video evidence and details before accepting or rejecting
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviewPost(null);
                  setRejectingPost(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Column Responsive Split */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
              {/* Media Column (Left) */}
              <div className="lg:col-span-7 bg-slate-950 flex flex-col items-center justify-center min-h-[320px] p-2 relative group">
                {previewPost.media_type === 'video' ? (
                  <video
                    src={previewPost.media_url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[65vh] w-full object-contain rounded-xl"
                  />
                ) : (
                  <img
                    src={previewPost.media_url}
                    alt={previewPost.caption || 'Evidence'}
                    className="max-h-[65vh] w-full object-contain rounded-xl"
                  />
                )}

                <a
                  href={previewPost.media_url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black text-white text-[11px] font-semibold backdrop-blur-xs transition shadow-lg"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open Full Resolution</span>
                </a>
              </div>

              {/* Details & Review Column (Right) */}
              <div className="lg:col-span-5 p-6 flex flex-col justify-between space-y-6 bg-white overflow-y-auto">
                <div className="space-y-5">
                  {/* Author Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {previewPost.author_name ? previewPost.author_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{previewPost.author_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="capitalize">{previewPost.author_scope?.toLowerCase() || 'Member'}</span>
                        <span>•</span>
                        <span>{new Date(previewPost.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Caption & Description */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Submitter's Description
                    </span>
                    <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                      {previewPost.caption || <span className="italic text-slate-400">No caption provided.</span>}
                    </p>
                  </div>
                </div>

                {/* Reject Input Panel if rejecting */}
                {rejectingPost?.id === previewPost.id ? (
                  <form onSubmit={submitReject} className="space-y-3 pt-4 border-t border-slate-100 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Select or enter rejection reason:
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {quickReasons.map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => setRejectReason(r)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition cursor-pointer ${
                              rejectReason === r
                                ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold'
                                : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <textarea
                        required
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Provide reason for rejection..."
                        rows={2}
                        className="w-full p-2.5 rounded-xl border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingPost(null);
                          setRejectReason('');
                        }}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!rejectReason.trim() || actionId === previewPost.id}
                        className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {actionId === previewPost.id && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                        <span>Confirm Rejection</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Primary Decision Footer */
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <button
                      disabled={actionId === previewPost.id}
                      onClick={() => decide(previewPost.id, 'APPROVED')}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {actionId === previewPost.id ? (
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[3]" />
                      )}
                      <span>Accept</span>
                    </button>

                    <button
                      disabled={actionId === previewPost.id}
                      onClick={() => handleOpenReject(previewPost)}
                      className="w-full py-2.5 px-4 rounded-2xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 🛑 QUICK REJECT MODAL (If triggered directly from card)       */}
      {/* ============================================================ */}
      {rejectingPost && !previewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Reject Post Request</h3>
              <button
                onClick={() => {
                  setRejectingPost(null);
                  setRejectReason('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Provide feedback to <strong>{rejectingPost.author_name}</strong> so they understand why the submission was rejected.
            </p>

            <form onSubmit={submitReject} className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {quickReasons.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRejectReason(r)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border text-left transition cursor-pointer ${
                      rejectReason === r
                        ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                required
                autoFocus
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (required)..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingPost(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim() || actionId === rejectingPost.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionId === rejectingPost.id && <LoaderCircle className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
