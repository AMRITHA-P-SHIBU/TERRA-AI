import React, { useState } from 'react';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  PlusCircle, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Image as ImageIcon, 
  Check, 
  Tag,
  Filter
} from 'lucide-react';

export default function GreenFeed({ posts, setPosts, currentUser }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({
    caption: '',
    category: 'tree_planting',
    categoryLabel: 'Tree Planting',
    image: '',
    location: currentUser.location || 'Local Community'
  });
  const [successNotice, setSuccessNotice] = useState('');

  const categories = [
    { id: 'all', label: 'All Activities' },
    { id: 'tree_planting', label: 'Tree Planting 🌳' },
    { id: 'waste_cleanup', label: 'Waste Cleanup 🧹' },
    { id: 'recycling', label: 'Recycling ♻️' },
    { id: 'upcycling', label: 'Upcycling 🎨' },
    { id: 'organic_gardening', label: 'Gardening 🪴' },
    { id: 'sustainable_transport', label: 'Green Travel 🚲' }
  ];

  const handleLike = (postId) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isLiked: !p.isLiked,
          likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
        };
      }
      return p;
    }));
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPost.caption.trim()) return;

    const catObj = categories.find(c => c.id === newPost.category);

    const postObj = {
      id: `post-${Date.now()}`,
      author: {
        name: currentUser.fullName,
        username: currentUser.username,
        avatar: currentUser.avatar,
        badge: currentUser.levelTitle
      },
      category: newPost.category,
      categoryLabel: catObj ? catObj.label.split(' ')[0] : 'Eco Action',
      caption: newPost.caption,
      image: newPost.image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
      ecoPointsAwarded: 25,
      likesCount: 1,
      isLiked: true,
      commentsCount: 0,
      status: 'approved', // In full DB mode: 'pending' -> approved by admin
      createdAt: 'Just now',
      location: newPost.location
    };

    setPosts([postObj, ...posts]);
    setIsModalOpen(false);
    setNewPost({
      caption: '',
      category: 'tree_planting',
      categoryLabel: 'Tree Planting',
      image: '',
      location: currentUser.location || 'Local Community'
    });
    setSuccessNotice('🎉 Your eco action has been published! +25 EcoPoints added.');
    setTimeout(() => setSuccessNotice(''), 5000);
  };

  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 mb-8 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8">
          <span className="text-9xl">🌿</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-emerald-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>GreenFeed Social Community</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Inspire change. Share your green milestones.
            </h1>
            <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
              Every tree planted, plastic item recycled, and compost cycle completed creates a cleaner community. Share what you did today and earn EcoPoints.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 hover:shadow-lg hover:scale-105 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            <span>Share Eco Action</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in shadow-xs">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 px-2 uppercase tracking-wider shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Posts Stream */}
      <div className="space-y-6">
        {filteredPosts.map(post => (
          <article 
            key={post.id}
            className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
          >
            {/* Post Author Bar */}
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-emerald-100"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{post.author.name}</h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {post.author.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>@{post.author.username}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {post.location}
                    </span>
                    <span>•</span>
                    <span>{post.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* EcoPoints Badge & Status */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+{post.ecoPointsAwarded} pts</span>
                </div>
                <div 
                  title="Verified by Eco Community Admin"
                  className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded-full border border-teal-200"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified</span>
                </div>
              </div>
            </div>

            {/* Post Media */}
            {post.image && (
              <div className="relative aspect-video sm:aspect-2/1 bg-slate-100 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-slate-900/70 text-white text-xs font-semibold backdrop-blur-md">
                  {post.categoryLabel}
                </span>
              </div>
            )}

            {/* Post Caption */}
            <div className="p-5">
              <p className="text-slate-700 text-sm leading-relaxed sm:text-base">
                {post.caption}
              </p>

              {/* Engagement Bar */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                      post.isLiked
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <span>{post.commentsCount} comments</span>
                  </button>
                </div>

                <button 
                  onClick={() => alert('Link copied to clipboard!')}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Share Eco Action Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Post Green Action</h3>
                <p className="text-xs text-slate-500">Inspire others & earn EcoPoints</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="mt-5 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Action Category
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="tree_planting">Tree Planting 🌳</option>
                  <option value="waste_cleanup">Waste / Beach Cleanup 🧹</option>
                  <option value="recycling">Recycling & Segregation ♻️</option>
                  <option value="upcycling">Upcycling Discarded Items 🎨</option>
                  <option value="organic_gardening">Composting & Organic Gardening 🪴</option>
                  <option value="sustainable_transport">Public Transit / Cycling 🚲</option>
                </select>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Describe what you did
                </label>
                <textarea
                  required
                  rows={3}
                  value={newPost.caption}
                  onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                  placeholder="e.g. Started my first kitchen compost pot with veggie peels and coco-peat! Diverting 3kg waste/week..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Image URL with instant preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo URL (Proof of Action)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newPost.image}
                    onChange={(e) => setNewPost({ ...newPost, image: e.target.value })}
                    placeholder="https://images.unsplash.com/... (or paste image link)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                {newPost.image && (
                  <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 max-h-40">
                    <img src={newPost.image} alt="Preview" className="w-full h-36 object-cover" />
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Location / City
                </label>
                <input
                  type="text"
                  value={newPost.location}
                  onChange={(e) => setNewPost({ ...newPost, location: e.target.value })}
                  placeholder="e.g. Kochi, Kerala"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* EcoPoints Incentive Notice */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <span className="font-semibold">Reward for this action:</span>
                <span className="font-extrabold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900">
                  +25 EcoPoints
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 text-sm font-semibold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Publish Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
