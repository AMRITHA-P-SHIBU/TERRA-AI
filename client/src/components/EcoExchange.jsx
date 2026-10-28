import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Repeat, 
  Gift, 
  DollarSign, 
  Search, 
  MapPin, 
  Plus, 
  ShieldCheck, 
  MessageCircle, 
  Filter,
  Sparkles,
  Check
} from 'lucide-react';

export default function EcoExchange({ items, setItems, currentUser }) {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactModalItem, setContactModalItem] = useState(null);
  const [contactMessage, setContactMessage] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

  const [newItem, setNewItem] = useState({
    title: '',
    category: 'coconut_products',
    categoryLabel: 'Coconut Crafts',
    listingType: 'sell',
    price: '',
    exchangeFor: '',
    condition: 'Handmade New',
    location: currentUser.location || 'Local Community',
    description: '',
    image: ''
  });

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'coconut_products', label: 'Coconut Crafts 🥥' },
    { id: 'plant_pots', label: 'Plant Pots 🪴' },
    { id: 'compost_bins', label: 'Compost Bins 🗑️' },
    { id: 'plants_seeds', label: 'Seeds & Saplings 🌱' },
    { id: 'gardening_tools', label: 'Gardening Tools 🛠️' },
    { id: 'recycled_crafts', label: 'Recycled Crafts 🎨' },
    { id: 'reusable_items', label: 'Zero-Waste Reusables 🍶' }
  ];

  const listingTypes = [
    { id: 'all', label: 'All Listings' },
    { id: 'sell', label: 'For Sale 🏷️' },
    { id: 'exchange', label: 'Exchange 🔄' },
    { id: 'donate', label: 'Free Donation 🎁' }
  ];

  const handleCreateListing = (e) => {
    e.preventDefault();
    if (!newItem.title.trim()) return;

    const cat = categories.find(c => c.id === newItem.category);

    const itemObj = {
      id: `item-${Date.now()}`,
      title: newItem.title,
      seller: {
        name: currentUser.fullName,
        avatar: currentUser.avatar,
        rating: 5.0
      },
      category: newItem.category,
      categoryLabel: cat ? cat.label.split(' ')[0] : 'Sustainable Good',
      listingType: newItem.listingType,
      price: newItem.listingType === 'sell' ? Number(newItem.price) || 0 : 0,
      exchangeFor: newItem.exchangeFor,
      location: newItem.location,
      description: newItem.description,
      image: newItem.image || 'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=600&q=80',
      status: 'approved',
      condition: newItem.condition,
      createdAt: 'Just now'
    };

    setItems([itemObj, ...items]);
    setIsModalOpen(false);
    setNewItem({
      title: '',
      category: 'coconut_products',
      categoryLabel: 'Coconut Crafts',
      listingType: 'sell',
      price: '',
      exchangeFor: '',
      condition: 'Handmade New',
      location: currentUser.location || 'Local Community',
      description: '',
      image: ''
    });
    setFeedbackNotice('🎉 Listing added to Eco Exchange Hub! Promotes local circular economy.');
    setTimeout(() => setFeedbackNotice(''), 5000);
  };

  const handleSendInquiry = (e) => {
    e.preventDefault();
    setFeedbackNotice(`📩 Inquiry sent to ${contactModalItem.seller.name}! They will be notified via email.`);
    setContactModalItem(null);
    setContactMessage('');
    setTimeout(() => setFeedbackNotice(''), 5000);
  };

  const filteredItems = items.filter(item => {
    const matchesType = selectedType === 'all' || item.listingType === selectedType;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-green-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/30 text-teal-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-teal-400/20">
              <Repeat className="w-3.5 h-3.5" />
              <span>Circular Economy Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Eco Exchange Hub: Reuse, Donate & Trade
            </h1>
            <p className="mt-2 text-teal-100 text-sm leading-relaxed">
              Buy, sell, exchange, or donate pre-loved and eco-friendly goods locally. Plant pots, coconut shell crafts, compost bins, and organic seeds. Keep valuable materials out of landfills!
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 hover:shadow-lg hover:scale-105 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>List an Eco Item</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {feedbackNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fade-in shadow-xs">
          <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">{feedbackNotice}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plant pots, compost bins, coconut crafts, seeds, location..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {listingTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedType === type.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
            Category:
          </span>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Marketplace Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No items match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting your search query or listing a new item in your area!</p>
          <button
            onClick={() => { setSelectedType('all'); setSelectedCategory('all'); setSearchQuery(''); }}
            className="mt-4 px-4 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
            >
              {/* Image & Type Badge */}
              <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Type Badge */}
                <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm backdrop-blur-md ${
                  item.listingType === 'donate'
                    ? 'bg-emerald-500 text-white'
                    : item.listingType === 'exchange'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-500 text-slate-900'
                }`}>
                  {item.listingType === 'donate' ? 'Free Donation' : item.listingType === 'exchange' ? 'Exchange' : `₹${item.price}`}
                </span>

                <span className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-md bg-slate-900/70 text-white text-[11px] font-medium backdrop-blur-sm">
                  {item.condition}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-1">
                  <span>{item.categoryLabel}</span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-relaxed flex-1">
                  {item.description}
                </p>

                {item.listingType === 'exchange' && item.exchangeFor && (
                  <div className="mt-3 p-2 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900 font-medium">
                    <span className="font-bold">Trade for:</span> {item.exchangeFor}
                  </div>
                )}

                {/* Seller & Location Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.seller.avatar}
                      alt={item.seller.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 leading-none">{item.seller.name}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[110px]">{item.location}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setContactModalItem(item)}
                    className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                    title="Inquire about item"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List an Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">List an Eco Item</h3>
                <p className="text-xs text-slate-500">Promote the circular economy in your area</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateListing} className="mt-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Item Title
                </label>
                <input
                  required
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="e.g. 3-Tier Kitchen Compost Pot / Seedling Kit"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Category & Listing Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="coconut_products">Coconut Crafts 🥥</option>
                    <option value="plant_pots">Plant Pots 🪴</option>
                    <option value="compost_bins">Compost Bins 🗑️</option>
                    <option value="plants_seeds">Seeds & Saplings 🌱</option>
                    <option value="gardening_tools">Gardening Tools 🛠️</option>
                    <option value="recycled_crafts">Recycled Crafts 🎨</option>
                    <option value="reusable_items">Zero-Waste Reusable 🍶</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Listing Type
                  </label>
                  <select
                    value={newItem.listingType}
                    onChange={(e) => setNewItem({ ...newItem, listingType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="sell">Sell (Set Price)</option>
                    <option value="exchange">Exchange (Barter)</option>
                    <option value="donate">Free Donation</option>
                  </select>
                </div>
              </div>

              {/* Price or Exchange details */}
              {newItem.listingType === 'sell' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Price (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="e.g. 150"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {newItem.listingType === 'exchange' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    What would you like in exchange?
                  </label>
                  <input
                    type="text"
                    required
                    value={newItem.exchangeFor}
                    onChange={(e) => setNewItem({ ...newItem, exchangeFor: e.target.value })}
                    placeholder="e.g. Flower seeds, aloe vera sapling, or jute bags"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Description & Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Item Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Describe material, dimensions, condition, and why it is sustainable..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Image URL
                </label>
                <input
                  type="url"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  placeholder="Paste image link from Unsplash or Cloudinary"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Condition
                  </label>
                  <select
                    value={newItem.condition}
                    onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Handmade New">Handmade New</option>
                    <option value="Like New">Like New</option>
                    <option value="Lightly Used">Lightly Used</option>
                    <option value="Upcycled">Upcycled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newItem.location}
                    onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  Publish Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inquire / Contact Modal */}
      {contactModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Inquire with {contactModalItem.seller.name}</h3>
              <button 
                onClick={() => setContactModalItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <img src={contactModalItem.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <p className="text-xs font-bold text-slate-800 line-clamp-1">{contactModalItem.title}</p>
                <p className="text-[11px] text-emerald-700 font-semibold">
                  {contactModalItem.listingType === 'donate' ? 'Free Donation' : contactModalItem.listingType === 'exchange' ? 'Exchange' : `₹${contactModalItem.price}`}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendInquiry} className="space-y-3">
              <textarea
                required
                rows={3}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={`Hi ${contactModalItem.seller.name}, I am interested in this item. Is it still available in ${contactModalItem.location}?`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setContactModalItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-md cursor-pointer"
                >
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
