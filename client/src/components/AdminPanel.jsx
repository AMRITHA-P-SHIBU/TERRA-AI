import { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  X, 
  AlertTriangle, 
  Leaf, 
} from 'lucide-react';

export default function AdminPanel({ posts, setPosts }) {
  // Pending queue state
  const [pendingPosts, setPendingPosts] = useState([
    {
      id: 'pending-post-1',
      author: {
        name: 'Siddharth Nair',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        username: 'sid_clean'
      },
      category: 'waste_cleanup',
      categoryLabel: 'Beach Cleanup',
      caption: 'Organized a weekend clean-up drive at Fort Kochi beach with 12 volunteers. Segregated 65kg of ocean-bound plastic!',
      image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=600&q=80',
      ecoPointsAwarded: 35,
      location: 'Kochi, Kerala',
      submittedAt: '15 mins ago'
    }
  ]);

  const [notification, setNotification] = useState('');

  const handleApprovePost = (post) => {
    // Add to approved feed
    const approved = {
      ...post,
      status: 'approved',
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      createdAt: 'Just now'
    };
    setPosts([approved, ...posts]);
    setPendingPosts(pendingPosts.filter(p => p.id !== post.id));
    setNotification(`✅ Approved "${post.caption.slice(0, 30)}..." and awarded +${post.ecoPointsAwarded} EcoPoints!`);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleRejectPost = (postId) => {
    setPendingPosts(pendingPosts.filter(p => p.id !== postId));
    setNotification('❌ Post rejected and sent back to author for review.');
    setTimeout(() => setNotification(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-emerald-400/20">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Admin Moderation Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Content Approval & Trust Center
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Review community environmental actions before awarding EcoPoints and help keep the feed trustworthy.
          </p>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold animate-fade-in shadow-xs flex items-center gap-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Moderation Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{pendingPosts.length}</p>
            <p className="text-xs text-slate-500 font-medium">Pending Verifications</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{posts.length}</p>
            <p className="text-xs text-slate-500 font-medium">Approved GreenFeed Actions</p>
          </div>
        </div>

      </div>

      {/* Pending GreenFeed Posts Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-600" />
            <span>Pending GreenFeed Actions ({pendingPosts.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">Verification awards EcoPoints to users</span>
        </div>

        {pendingPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-slate-500 text-sm">
            ✨ No pending GreenFeed actions. All user contributions are up to date!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingPosts.map(post => (
              <div key={post.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <img src={post.author.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{post.author.name}</p>
                        <p className="text-[10px] text-slate-400">@{post.author.username} • {post.submittedAt}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                      +{post.ecoPointsAwarded} pts
                    </span>
                  </div>

                  {post.image && (
                    <div className="aspect-video rounded-2xl overflow-hidden mb-3 bg-slate-100">
                      <img src={post.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <p className="text-xs text-slate-700 leading-relaxed mb-4">
                    {post.caption}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleRejectPost(post.id)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleApprovePost(post)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve & Award Points</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
