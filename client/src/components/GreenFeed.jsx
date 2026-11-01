import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Heart, Image as ImageIcon, LoaderCircle, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PostDetailModal } from '../pages/ProfilePage';
import { getFeed } from '../services/profileService';

export default function GreenFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPosts(await getFeed());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getFeed()
      .then((feedPosts) => { if (active) setPosts(feedPosts); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const notify = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const removePost = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {selectedPostId && <PostDetailModal postId={selectedPostId} currentUserId={user?.id} onClose={() => { setSelectedPostId(null); load(); }} onDeleted={removePost} notify={notify} />}
      <header className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-800 p-6 text-white shadow-xl md:p-8">
        <div className="pointer-events-none absolute -bottom-8 right-0 translate-x-6 text-9xl opacity-10">🌿</div>
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="mb-2 inline-flex rounded-full border border-emerald-300/20 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-100">GreenFeed Social Community</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Inspire change. Share green milestones.</h1>
            <p className="mt-2 text-sm leading-relaxed text-emerald-100">Approved actions from your community. Individual accounts and organization communities stay separate.</p>
          </div>
          <button onClick={() => navigate('/profile')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-emerald-900 shadow hover:bg-emerald-50">
            <Plus className="h-5 w-5" /> Create a post
          </button>
        </div>
      </header>

      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="h-4 w-4" />{error}<button onClick={load} className="ml-auto font-bold underline">Retry</button></div>}

      {loading ? (
        <div className="space-y-5">{[1, 2].map((item) => <div key={item} className="h-[28rem] animate-pulse rounded-3xl bg-slate-200" />)}</div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-5 py-16 text-center">
          <ImageIcon className="mx-auto mb-3 h-11 w-11 text-emerald-300" />
          <h2 className="font-bold text-slate-800">No approved posts in your feed yet</h2>
          <p className="mt-1 text-sm text-slate-500">Approved community posts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => setSelectedPostId(post.id)} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-white shadow-[0_0_16px_2px_rgba(52,211,153,0.2)]">{(post.author_name || '?').charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-slate-900">{post.author_name}</p>
                  <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </button>
              <button onClick={() => setSelectedPostId(post.id)} aria-label="Open post" className="flex max-h-[34rem] min-h-40 w-full items-center justify-center bg-slate-950">
                {post.media_type === 'video' ? <video src={post.media_url} muted playsInline className="max-h-[34rem] w-full object-contain" /> : <img src={post.media_url} alt={post.caption || 'Community post'} className="max-h-[34rem] w-full object-contain" />}
              </button>
              <div className="p-4 sm:p-5">
                <div className="mb-2 flex gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4 text-rose-500" />{post.like_count || 0}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4 text-emerald-700" />{post.comment_count || 0}</span>
                </div>
                {post.caption && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700"><strong className="text-slate-900">{post.author_name}</strong> {post.caption}</p>}
                <button onClick={() => setSelectedPostId(post.id)} className="mt-2 text-xs font-bold text-emerald-700 hover:underline">Like or comment</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && posts.length > 0 && <button onClick={load} disabled={loading} className="mx-auto mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh feed</button>}
      {loading && <LoaderCircle className="sr-only" />}
    </div>
  );
}
