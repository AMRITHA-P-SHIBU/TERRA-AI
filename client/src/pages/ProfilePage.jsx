import BackButton from "../components/BackButton";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, CalendarDays, Check, Heart, Image as ImageIcon,
  LoaderCircle, Mail, MapPin, MessageCircle, Pencil, Phone, Play,
  Plus, Send, Trash2, UserRound, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AvatarCircle from '../components/AvatarCircle';
import {
  createPost, deleteComment, deletePost, getPostDetail, getProfile,
  getUserPosts, addComment, togglePostLike, updateProfile,
  IMAGE_SIZE_LIMIT, POST_CAPTION_LIMIT, VIDEO_DURATION_LIMIT_SECONDS, VIDEO_SIZE_LIMIT,
} from '../services/profileService';

function Media({ post, className = '' }) {
  if (!post?.media_url) return <div className={`flex items-center justify-center bg-slate-100 ${className}`}><ImageIcon className="w-10 h-10 text-slate-300" /></div>;
  return post.media_type === 'video' ? (
    <video src={post.media_url} controls playsInline className={className} />
  ) : (
    <img src={post.media_url} alt={post.caption || 'Post media'} className={className} />
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div role="status" className={`fixed bottom-5 right-5 z-[90] flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-700'}`}>
      {toast.type === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
      <span>{toast.message}</span>
      <button onClick={onClose} aria-label="Close notification"><X className="h-4 w-4" /></button>
    </div>
  );
}

function AddPostModal({ onClose, onCreated }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [durationReady, setDurationReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = (selected) => {
    if (!selected) return;
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const mediaType = imageTypes.includes(selected.type) ? 'image' : videoTypes.includes(selected.type) ? 'video' : '';
    if (!mediaType) {
      setError('Choose an image or video file.');
      return;
    }
    const limit = mediaType === 'image' ? IMAGE_SIZE_LIMIT : VIDEO_SIZE_LIMIT;
    if (selected.size > limit) {
      setError(mediaType === 'image' ? 'Images must be 10 MB or smaller.' : 'Videos must be 50 MB or smaller.');
      return;
    }
    setError('');
    setDurationReady(mediaType === 'image');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
    setFile(selected);
  };

  const handleVideoMetadata = (event) => {
    if (!Number.isFinite(event.currentTarget.duration) || event.currentTarget.duration > VIDEO_DURATION_LIMIT_SECONDS) {
      setError('Videos must be 60 seconds or shorter.');
      setFile(null);
      setPreviewUrl('');
      setDurationReady(true);
    } else {
      setError('');
      setDurationReady(true);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return setError('Choose a photo or video to continue.');
    if (!durationReady) return setError('Wait for the video preview to finish checking its duration.');
    setBusy(true);
    setError('');
    try {
      const result = await createPost(null, { file, caption: caption.trim() });
      onCreated(result);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="add-post-title" className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="add-post-title" className="text-lg font-extrabold text-slate-900">Create a post</h2>
            <p className="text-xs text-slate-500">Your post is reviewed before it appears in the feed.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={submit} className="space-y-4 p-5">
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {file && previewUrl ? (
            <div className="relative overflow-hidden rounded-2xl bg-slate-100">
              {file.type.startsWith('video/') ? (
                <video src={previewUrl} controls playsInline onLoadedMetadata={handleVideoMetadata} onError={() => { setError('This video could not be previewed. Choose a supported video file.'); setFile(null); setPreviewUrl(''); }} className="max-h-[45vh] w-full object-contain" />
              ) : (
                <img src={previewUrl} alt="Post preview" className="max-h-[45vh] w-full object-contain" />
              )}
              <button type="button" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(''); setFile(null); setError(''); }} aria-label="Remove selected media" className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-2 text-white"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files?.[0]); }}
              className={`flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${dragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/50'}`}
            >
              <ImageIcon className="mb-3 h-9 w-9 text-emerald-600" />
              <span className="font-bold text-slate-800">Choose a photo or video</span>
              <span className="mt-1 text-xs text-slate-500">or drag and drop • images up to 10 MB • videos up to 50 MB / 60 sec</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => selectFile(event.target.files?.[0])} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-700">Caption</span>
            <textarea value={caption} maxLength={POST_CAPTION_LIMIT} rows={4} onChange={(event) => setCaption(event.target.value)} placeholder="Share the story behind your post…" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
            <span className="mt-1 block text-right text-xs text-slate-400">{caption.length}/{POST_CAPTION_LIMIT}</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button disabled={busy || !file || !durationReady} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? 'Sending…' : 'Send for approval'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function PostDetailModal({ postId, currentUserId, onClose, onDeleted, notify }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setDetail(await getPostDetail(postId));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [postId]);

  useEffect(() => {
    let active = true;
    getPostDetail(postId)
      .then((postDetail) => { if (active) setDetail(postDetail); })
      .catch((loadError) => { if (active) setError(loadError.message); });
    return () => { active = false; };
  }, [postId]);

  const changeLike = async () => {
    if (!detail) return;
    const wasLiked = detail.post.liked_by_viewer;
    setDetail((current) => ({ ...current, post: { ...current.post, liked_by_viewer: !wasLiked, like_count: current.post.like_count + (wasLiked ? -1 : 1) } }));
    try {
      const result = await togglePostLike(postId);
      if (result.liked === wasLiked) await load();
    } catch (likeError) {
      await load();
      notify(likeError.message, 'error');
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const { comment } = await addComment(postId, commentText.trim());
      setDetail((current) => ({ ...current, comments: [...current.comments, comment] }));
      setCommentText('');
    } catch (commentError) {
      notify(commentError.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (commentId) => {
    try {
      await deleteComment(postId, commentId);
      setDetail((current) => ({ ...current, comments: current.comments.filter((item) => item.id !== commentId) }));
    } catch (deleteError) {
      notify(deleteError.message, 'error');
    }
  };

  const removePost = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    try {
      await deletePost(postId);
      onDeleted(postId);
      onClose();
    } catch (deleteError) {
      notify(deleteError.message, 'error');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label="Post details" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row">
        <div className="flex min-h-52 items-center justify-center bg-slate-950 md:w-1/2">
          {detail ? <Media post={detail.post} className="max-h-[50vh] w-full object-contain md:max-h-[92vh]" /> : <LoaderCircle className="h-8 w-8 animate-spin text-emerald-400" />}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">{detail?.post.author_name || 'Post'}</p>
              <p className="text-xs text-slate-500">{detail?.post.created_at ? new Date(detail.post.created_at).toLocaleString() : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              {detail?.post.author_id === currentUserId && <button onClick={removePost} disabled={busy} title="Delete post" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
              <button onClick={onClose} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
            </div>
          </header>
          {error && <p role="alert" className="px-4 pt-3 text-sm text-rose-700">{error}</p>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <p className="whitespace-pre-wrap text-sm text-slate-700">{detail?.post.caption}</p>
            {!detail ? <LoaderCircle className="mx-auto mt-8 h-6 w-6 animate-spin text-emerald-600" /> : detail.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-900">{comment.author_name} </span>
                  <span className="break-words text-slate-700">{comment.comment}</span>
                  <p className="mt-0.5 text-[11px] text-slate-400">{new Date(comment.created_at).toLocaleString()}</p>
                </div>
                {comment.can_delete && <button onClick={() => removeComment(comment.id)} title="Delete comment" className="self-start p-1 text-slate-400 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3">
            <button onClick={changeLike} disabled={!detail} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Heart className={`h-5 w-5 ${detail?.post.liked_by_viewer ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} /> {detail?.post.like_count || 0} likes
            </button>
            <form onSubmit={submitComment} className="flex gap-2">
              <input value={commentText} maxLength={300} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
              <button disabled={busy || !commentText.trim()} className="rounded-xl bg-emerald-700 p-2.5 text-white disabled:opacity-50"><Send className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${styles}`}>{status}</span>;
}

export default function ProfilePage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [addPostOpen, setAddPostOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState('');

  const notify = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [nextProfile, nextPosts] = await Promise.all([getProfile(), getUserPosts()]);
      setProfile(nextProfile);
      setBio(nextProfile.bio || '');
      setPosts(nextPosts);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getProfile(), getUserPosts()])
      .then(([nextProfile, nextPosts]) => {
        if (!active) return;
        setProfile(nextProfile);
        setBio(nextProfile.bio || '');
        setPosts(nextPosts);
      })
      .catch((error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveBio = async () => {
    setSavingBio(true);
    try {
      const result = await updateProfile(user?.id, { bio });
      setProfile((current) => ({ ...current, bio: result.bio }));
      setEditingBio(false);
      notify('Bio saved.');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSavingBio(false);
    }
  };

  const onPostCreated = (result) => {
    setAddPostOpen(false);
    setTab(result.post.status === 'APPROVED' ? 'posts' : 'requests');
    setPosts((current) => [result.post, ...current]);
    notify(result.message);
    loadProfile();
  };

  const onPostDeleted = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setProfile((current) => ({ ...current, post_count: Math.max(0, current.post_count - 1) }));
    notify('Post deleted.');
  };

  const approvedPosts = posts.filter((post) => post.status === 'APPROVED');
  const requests = posts.filter((post) => post.status === 'PENDING' || post.status === 'REJECTED');
  const displayedPosts = tab === 'posts' ? approvedPosts : requests;
  const name = profile?.full_name || user?.full_name || 'Terra member';

  return (
    <main className="min-h-screen bg-slate-50/70">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {addPostOpen && <AddPostModal onClose={() => setAddPostOpen(false)} onCreated={onPostCreated} />}
      {selectedPostId && <PostDetailModal postId={selectedPostId} currentUserId={user?.id} onClose={() => { setSelectedPostId(null); loadProfile(); }} onDeleted={onPostDeleted} notify={notify} />}

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <BackButton fallback="/dashboard/individual" label="Back to Dashboard" className="mb-5" />
        {loadError && <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="h-4 w-4" />{loadError}<button onClick={loadProfile} className="ml-auto font-bold underline">Retry</button></div>}

        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm sm:p-8">
          {loading && !profile ? (
            <div className="flex animate-pulse items-center gap-5">
              <div className="h-24 w-24 rounded-full bg-slate-200" />
              <div className="space-y-3"><div className="h-5 w-44 rounded bg-slate-200" /><div className="h-4 w-64 rounded bg-slate-200" /></div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <AvatarCircle fullName={name} avatarUrl={profile?.avatar_url} size="xl" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">{name}</h1>
                    <p className="text-sm text-slate-500">{profile?.email || user?.email}</p>
                  </div>
                  <button onClick={() => setAddPostOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-700/20 hover:brightness-110">
                    <Plus className="h-5 w-5" /> Add post
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-sm">
                  <span><strong className="text-slate-900">{profile?.post_count || 0}</strong> approved posts</span>
                  <span><strong className="text-slate-900">{profile?.total_likes || 0}</strong> likes received</span>
                  {profile?.total_ecopoints !== null && profile?.total_ecopoints !== undefined && (
                    <span><strong className="text-emerald-700">{profile.total_ecopoints}</strong> EcoPoints</span>
                  )}
                </div>
                <div className="mt-4">
                  {editingBio ? (
                    <div className="max-w-xl">
                      <textarea autoFocus rows={3} value={bio} onChange={(event) => setBio(Array.from(event.target.value).slice(0, 150).join(''))} placeholder="Write a short bio, your interests, or what inspires you…" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{Array.from(bio).length}/150</span>
                        <div className="flex gap-3">
                          <button onClick={() => { setBio(profile?.bio || ''); setEditingBio(false); }} className="text-sm font-semibold text-slate-500">Cancel</button>
                          <button onClick={saveBio} disabled={savingBio} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">{savingBio ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save bio</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{profile?.bio || <span className="italic text-slate-400">Add a bio to tell the community about yourself.</span>}</p>
                      <button onClick={() => setEditingBio(true)} aria-label={profile?.bio ? 'Edit bio' : 'Add bio'} className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"><Pencil className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-extrabold text-slate-900">Registration details</h2>
          {loading && !profile ? <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : (
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                [UserRound, 'Full name', profile?.full_name],
                [Mail, 'Email', profile?.email],
                [MapPin, 'Location', profile?.location],
                [Phone, 'Phone', profile?.phone],
                [UserRound, 'Account type', profile?.account_type === 'ORG_MEMBER' ? `Organization member${profile.organization_role ? ` (${profile.organization_role})` : ''}` : profile?.account_type || role],
                ...(profile?.organization ? [[UserRound, 'Organization', profile.organization.name]] : []),
                [CalendarDays, 'Member since', profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
              ].filter(([, , value]) => value).map(([Icon, label, value]) => (
                <div key={label} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="truncate text-sm font-semibold text-slate-800">{value}</dd></div>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="mt-7">
          <div className="mb-4 flex items-center justify-between border-b border-slate-200">
            <div className="flex gap-1">
              <button onClick={() => setTab('posts')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'posts' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'}`}>Posts <span className="ml-1 text-xs">({approvedPosts.length})</span></button>
              <button onClick={() => setTab('requests')} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === 'requests' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500'}`}>My Requests <span className="ml-1 text-xs">({requests.length})</span></button>
            </div>
            <button onClick={() => setAddPostOpen(true)} aria-label="Add post" className="mb-2 rounded-full bg-emerald-700 p-2.5 text-white shadow-lg shadow-emerald-700/20 hover:scale-105"><Plus className="h-5 w-5" /></button>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="aspect-square animate-pulse rounded-lg bg-slate-200" />)}</div>
          ) : displayedPosts.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 px-5 py-14 text-center">
              <ImageIcon className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
              <h3 className="font-bold text-slate-800">{tab === 'posts' ? 'No posts yet. Tap + to share your first post!' : 'No pending or rejected requests.'}</h3>
              {tab === 'posts' && <button onClick={() => setAddPostOpen(true)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Create post</button>}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
              {displayedPosts.map((post) => (
                <button key={post.id} onClick={() => setSelectedPostId(post.id)} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 text-left sm:rounded-xl">
                  {post.media_type === 'video' ? <video src={post.media_url} muted playsInline className="h-full w-full object-cover" /> : <img src={post.media_url} alt={post.caption || 'Post'} className="h-full w-full object-cover transition group-hover:scale-105" />}
                  {post.media_type === 'video' && <span className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white"><Play className="h-3.5 w-3.5 fill-white" /></span>}
                  {tab === 'requests' && <span className="absolute left-2 top-2"><StatusBadge status={post.status} /></span>}
                  <span className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-950/55 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1"><Heart className="h-4 w-4 fill-white" />{post.like_count || 0}</span>
                    <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" />{post.comment_count || 0}</span>
                  </span>
                  {post.status === 'REJECTED' && post.rejection_reason && <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-rose-700/90 px-2 py-1.5 text-[10px] font-semibold text-white">Reason: {post.rejection_reason}</span>}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
