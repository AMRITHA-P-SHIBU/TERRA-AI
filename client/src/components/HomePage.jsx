import React, { useState } from 'react';
import {
  Leaf,
  ArrowRight,
  Compass,
  Sparkles,
  Heart,
  Shield,
  Users,
  TreePine,
  Droplets,
  Sun,
  Wind,
  CheckCircle2,
  X,
  ExternalLink,
  ShoppingBag,
  Flame,
  Bot,
  Trophy,
  Globe2,
  ChevronRight,
  Menu,
  Check,
  RotateCcw,
  Plus,
  Award
} from 'lucide-react';

// Social Brand SVG Icons for Contact & Footer
function TwitterIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function XSocialIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function HomePage({ onExplore, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'donate' | 'join' | 'approach' | 'card-detail'
  const [selectedCard, setSelectedCard] = useState(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinForm, setJoinForm] = useState({ name: '', email: '', interest: 'climate' });
  const [donationAmount, setDonationAmount] = useState(25);
  const [donationInitiative, setDonationInitiative] = useState('trees');
  const [donationSuccess, setDonationSuccess] = useState(false);


  // 3 Sections of Fun Environmental Activities To-Do Lists (Exactly 3 per section)
  const initialTodos = {
    'green-living': [
      { id: 'gl-1', text: 'Pack a zero-waste lunch or cook a vibrant veggie meal', points: 15, completed: true, icon: '🥗' },
      { id: 'gl-2', text: 'Sip from a reusable mug or tumbler on your coffee run', points: 10, completed: false, icon: '☕' },
      { id: 'gl-3', text: 'Hunt down & unplug phantom vampire standby chargers', points: 10, completed: false, icon: '🔌' },
    ],
    'coastal-care': [
      { id: 'cc-1', text: 'Beat the clock: Take a brisk 4-minute speed shower', points: 15, completed: false, icon: '⏱️' },
      { id: 'cc-2', text: 'Spot & bin 3 stray pieces of plastic litter outdoors', points: 20, completed: true, icon: '🏖️' },
      { id: 'cc-3', text: 'Refill your reusable water bottle all day (skip plastic)', points: 10, completed: false, icon: '🚰' },
    ],
    'climate-action': [
      { id: 'ca-1', text: 'Ditch the car: Walk, cycle, or bus for one trip', points: 25, completed: false, icon: '🚲' },
      { id: 'ca-2', text: 'Air-dry a fresh laundry load with natural breeze & sun', points: 15, completed: false, icon: '🧺' },
      { id: 'ca-3', text: 'Go outside, hug a majestic tree & snap an eco-pic', points: 15, completed: true, icon: '🌳' },
    ],
  };

  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('terra_eco_todo_list_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialTodos;
  });

  const [newTodoInput, setNewTodoInput] = useState({ 'green-living': '', 'coastal-care': '', 'climate-action': '' });
  const [addingTaskFor, setAddingTaskFor] = useState(null);

  // Click & Unclick handler for any To-Do activity checkbox
  const toggleTodo = (category, todoId) => {
    setTodos((prev) => {
      const updated = {
        ...prev,
        [category]: prev[category].map((todo) =>
          todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        ),
      };
      try {
        localStorage.setItem('terra_eco_todo_list_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Reset section back to initial fun quests
  const handleResetSection = (category) => {
    setTodos((prev) => {
      const updated = {
        ...prev,
        [category]: initialTodos[category],
      };
      try {
        localStorage.setItem('terra_eco_todo_list_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Aggregated progress across all 3 sections
  const allTodos = Object.values(todos).flat();
  const totalCompleted = allTodos.filter((t) => t.completed).length;
  const totalPoints = allTodos.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0);
  const totalCount = allTodos.length;

  const cards = [
    {
      id: 'green-living',
      title: 'Green Living',
      noteTitle: 'Green Living Memo',
      subtitle: '3 Daily Eco-Habits',
      pinEmoji: '🌿',
      paperBg: 'bg-[#edf6dd]', // exactly matches user image's pastel sage sticky note!
      foldColor: '#d2deb8',
      tapeColor: 'rgba(180, 210, 160, 0.75)',
      tapeDot: '#769b61',
      tilt: 'rotate-[-1.5deg]',
      hoverTilt: 'hover:rotate-0',
      badgeColor: 'bg-emerald-800 text-emerald-100',
      targetTab: 'feed',
    },
    {
      id: 'coastal-care',
      title: 'Coastal Care',
      noteTitle: 'Coastal Care Note',
      subtitle: '3 Ocean & Water Quests',
      pinEmoji: '🌊',
      paperBg: 'bg-[#eaf4f8]', // pastel coastal blue sticky note
      foldColor: '#cadde8',
      tapeColor: 'rgba(170, 205, 230, 0.75)',
      tapeDot: '#5283a5',
      tilt: 'rotate-[1.2deg]',
      hoverTilt: 'hover:rotate-0',
      badgeColor: 'bg-sky-900 text-sky-100',
      targetTab: 'exchange',
    },
    {
      id: 'climate-action',
      title: 'Climate Action',
      noteTitle: 'Climate Action Pad',
      subtitle: '3 Carbon Power Moves',
      pinEmoji: '⚡',
      paperBg: 'bg-[#fbf7dc]', // pastel sunny memo paper
      foldColor: '#e5dcbe',
      tapeColor: 'rgba(235, 215, 150, 0.75)',
      tapeDot: '#a88c3a',
      tilt: 'rotate-[-0.8deg]',
      hoverTilt: 'hover:rotate-0',
      badgeColor: 'bg-amber-900 text-amber-100',
      targetTab: 'calculator',
    },
  ];

  const features = [
    {
      id: 'feed',
      title: 'GreenFeed Community',
      desc: 'Share verified sustainable actions, inspire peers, and earn instant EcoPoints with peer verification.',
      icon: Leaf,
      color: 'from-emerald-500 to-green-600',
      tag: 'Social Impact',
    },
    {
      id: 'exchange',
      title: 'Eco Exchange Marketplace',
      desc: 'Trade, borrow, or gift pre-loved items to keep quality goods circulating and out of landfills.',
      icon: ShoppingBag,
      color: 'from-teal-500 to-emerald-600',
      tag: 'Circular Economy',
    },
    {
      id: 'calculator',
      title: 'Precision Carbon Tracker',
      desc: 'Monitor daily transportation, diet, and energy metrics with instant carbon-cost breakdowns.',
      icon: Flame,
      color: 'from-amber-500 to-orange-600',
      tag: 'Analytics',
    },
    {
      id: 'ai',
      title: 'AI Eco Assistant',
      desc: 'Gemini-powered conversational advisor for home energy audits, eco recipes, and recycling questions.',
      icon: Bot,
      color: 'from-cyan-500 to-blue-600',
      tag: 'Gemini AI',
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard & Badges',
      desc: 'Turn climate stewardship into a rewarding journey with tangible achievements and friendly rivalry.',
      icon: Trophy,
      color: 'from-yellow-500 to-amber-600',
      tag: 'Gamification',
    },
  ];

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setActiveModal('card-detail');
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    setJoinSuccess(true);
    setTimeout(() => {
      setActiveModal(null);
      setJoinSuccess(false);
      onExplore();
    }, 1800);
  };

  const handleDonateSubmit = (e) => {
    e.preventDefault();
    setDonationSuccess(true);
    setTimeout(() => {
      setActiveModal(null);
      setDonationSuccess(false);
    }, 2000);
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
      {/* -------------------- TOP NAVBAR (Matches User Reference) -------------------- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo: Official TERRA AI Logo */}
            <div 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center cursor-pointer group py-1"
              title="TERRA AI"
            >
              <img 
                src="/terra-ai-logo.svg" 
                alt="TERRA AI Logo" 
                className="h-12 w-auto object-contain rounded-lg group-hover:scale-102 transition-transform" 
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                className="text-emerald-800 font-bold text-sm tracking-wide hover:text-emerald-900 transition-colors cursor-pointer"
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about-us')} 
                className="text-slate-600 font-semibold text-sm tracking-wide hover:text-emerald-800 transition-colors cursor-pointer"
              >
                About Us
              </button>
              <button 
                onClick={() => scrollToSection('features')} 
                className="text-slate-600 font-semibold text-sm tracking-wide hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('our-work')} 
                className="text-slate-600 font-semibold text-sm tracking-wide hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Our Work
              </button>
              <button 
                onClick={() => scrollToSection('contact')} 
                className="text-slate-600 font-semibold text-sm tracking-wide hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>

            {/* Actions: Join Us & EXPLORE BUTTON */}
            <div className="hidden sm:flex items-center gap-3">
              {/* Join Us Button (Soft Blue Pill) */}
              <button
                onClick={() => setActiveModal('join')}
                className="px-5 py-2 rounded-full text-sm font-bold bg-[#d8f0fa] text-[#16425b] hover:bg-[#c9eaf7] hover:scale-102 active:scale-98 transition-all cursor-pointer shadow-xs"
              >
                Join Us
              </button>

              {/* Explore Button (Takes you directly to the current main page) */}
              <button
                onClick={onExplore}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-extrabold bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 hover:scale-105 active:scale-98 transition-all cursor-pointer group"
                title="Enter the Terra AI Main Platform"
              >
                <span>Explore Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <div className="flex sm:hidden items-center gap-2">
              <button
                onClick={onExplore}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-700 text-white flex items-center gap-1 cursor-pointer"
              >
                <span>Explore Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-100 bg-white/98 px-4 pt-3 pb-6 space-y-3 shadow-lg">
            <button
              onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="block w-full text-left py-2 font-bold text-emerald-800"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about-us')}
              className="block w-full text-left py-2 font-semibold text-slate-700"
            >
              About Us
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 font-semibold text-slate-700"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('our-work')}
              className="block w-full text-left py-2 font-semibold text-slate-700"
            >
              Our Work
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="block w-full text-left py-2 font-semibold text-slate-700"
            >
              Contact
            </button>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setMobileMenuOpen(false); setActiveModal('join'); }}
                className="flex-1 py-2 text-center rounded-full text-xs font-bold bg-[#d8f0fa] text-[#16425b]"
              >
                Join Us
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onExplore(); }}
                className="flex-1 py-2 text-center rounded-full text-xs font-bold bg-emerald-700 text-white flex items-center justify-center gap-1"
              >
                <span>Explore Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* -------------------- HERO SECTION (Matches Reference Image) -------------------- */}
      <section className="relative overflow-hidden pt-6 pb-16 md:pt-10 md:pb-24 lg:min-h-[88vh] flex flex-col justify-between">
        {/* Floating Island Hero Background Image with Seamless Blend */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          {/* Main Visual on the right side */}
          <div 
            className="absolute top-0 right-0 w-full lg:w-[62%] h-full bg-no-repeat bg-right-top bg-contain lg:bg-cover opacity-95 transition-transform duration-1000 ease-out"
            style={{
              backgroundImage: `url('/floating-island.jpg')`,
            }}
          />

          {/* Left-to-Right seamless gradient mask to blend with pure white text background */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent lg:w-[58%]" />
          
          {/* Top subtle fade */}
          <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white to-transparent" />
          
          {/* Bottom subtle mist fade */}
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white via-white/60 to-transparent" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4 md:pt-10">
            {/* Left Column: Bold Typography & Actions */}
            <div className="lg:col-span-7 xl:col-span-6 space-y-6">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs font-bold backdrop-blur-xs shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Small Steps • Infinite Global Impact</span>
              </div>

              {/* Main Headline (Exact words and deep green hue from image) */}
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black text-[#133e24] tracking-tight leading-[1.04]">
                Small Actions,
                <br />
                Big Impact
              </h1>

              {/* Subheading (Exact words from image) */}
              <p className="text-base sm:text-lg md:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
                Every small step you take today creates a ripple of positive change for our planet's future
              </p>

              {/* CTA Buttons: Our Approach + EXPLORE BUTTON (User Request) */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                {/* Explore Button: Prominent Pill Taking to Current Main Page */}
                <button
                  onClick={onExplore}
                  className="px-8 py-4 rounded-full text-base font-extrabold bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white shadow-lg shadow-emerald-800/25 hover:shadow-xl hover:shadow-emerald-800/35 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 cursor-pointer group"
                >
                  <Compass className="w-5 h-5 text-emerald-200 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Explore Now</span>
                  <ArrowRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1.5 transition-transform duration-300" />
                </button>

                {/* Our Approach Button (Matches Reference Image color: #cad98d) */}
                <button
                  onClick={() => setActiveModal('approach')}
                  className="px-7 py-4 rounded-full text-base font-bold bg-[#cad98d] text-[#1c381c] hover:bg-[#bfcf82] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-xs"
                >
                  Our Approach
                </button>
              </div>

              {/* Social Proof / Live Counter */}
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <div className="flex -space-x-2 overflow-hidden">
                  <img className="inline-block h-7 w-7 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Member" />
                  <img className="inline-block h-7 w-7 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Member" />
                  <img className="inline-block h-7 w-7 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Member" />
                </div>
                <span>Joined by <strong className="text-emerald-800 font-bold">14,800+</strong> eco-warriors worldwide</span>
              </div>
            </div>

            {/* Right Column: Spacer on desktop to showcase the floating island background */}
            <div className="lg:col-span-5 xl:col-span-6 hidden lg:block min-h-[380px]" />
          </div>

          {/* -------------------- THREE STICKY PAPER NOTES (Only: 3/3 Done, To-Do List, Reset) -------------------- */}
          <div className="pt-10 md:pt-14">
            {/* 3 Sticky Paper Notes Grid: Green Living, Coastal Care, Climate Action */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-9 items-start">
              {cards.map((card) => {
                const cardTodos = (todos[card.id] || []).slice(0, 3); // Exactly 3 items per section
                const completedCount = cardTodos.filter((t) => t.completed).length;

                return (
                  <div
                    key={card.id}
                    className={`group relative ${card.paperBg} ${card.tilt} ${card.hoverTilt} p-6 sm:p-7 rounded-sm shadow-[0_14px_30px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between min-h-[340px] border border-black/5 select-none`}
                  >
                    {/* Washi Tape at Top-Right Corner */}
                    <div
                      className="absolute -top-3.5 right-5 w-24 h-7 bg-white/70 backdrop-blur-xs shadow-xs rotate-[33deg] pointer-events-none border-y border-dashed border-slate-400/50 z-20 flex items-center justify-center opacity-90"
                      style={{
                        backgroundImage: `radial-gradient(circle, ${card.tapeDot} 1.5px, transparent 1.5px)`,
                        backgroundSize: '7px 7px',
                      }}
                    />

                    {/* Curled / Folded Paper Corner at Bottom-Left */}
                    <div className="absolute bottom-0 left-0 w-11 h-11 pointer-events-none z-20 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 44 44">
                        {/* Shadow under the curled corner */}
                        <polygon points="0,44 44,44 0,0" fill="rgba(0,0,0,0.14)" />
                        {/* Folded paper flap */}
                        <polygon points="0,0 44,44 44,0" fill={card.foldColor} />
                        <line x1="0" y1="0" x2="44" y2="44" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                      </svg>
                    </div>

                    {/* Paper Note Content */}
                    <div className="relative z-10 pl-1">
                      {/* Top Bar with ONLY 3/3 Done */}
                      <div className="flex items-center justify-end mb-4 pb-2 border-b border-black/10">
                        <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${card.badgeColor} shadow-2xs`}>
                          {completedCount}/3 Done
                        </span>
                      </div>

                      {/* To-Do List with Clickable & Unclickable Checkboxes */}
                      <div className="space-y-3 my-2">
                        {cardTodos.map((todo) => {
                          return (
                            <div
                              key={todo.id}
                              onClick={() => toggleTodo(card.id, todo.id)}
                              className={`group/item flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border ${
                                todo.completed
                                  ? 'bg-white/70 border-emerald-400/80 shadow-2xs'
                                  : 'bg-white/40 border-black/8 hover:bg-white/80 hover:border-black/20 hover:shadow-xs'
                              }`}
                            >
                              {/* Clickable & Unclickable Checkbox in front of each to-do item */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTodo(card.id, todo.id);
                                }}
                                title={todo.completed ? 'Click to uncheck' : 'Click to check'}
                                aria-label={todo.completed ? 'Uncheck activity' : 'Check activity'}
                                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5 cursor-pointer ${
                                  todo.completed
                                    ? 'bg-emerald-700 border-2 border-emerald-700 text-white shadow-xs scale-105'
                                    : 'bg-white border-2 border-slate-400 group-hover/item:border-emerald-600 group-hover/item:scale-105 text-transparent'
                                }`}
                              >
                                <Check
                                  className={`w-3.5 h-3.5 stroke-[3.5] transition-transform duration-200 ${
                                    todo.completed ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                                  }`}
                                />
                              </button>

                              {/* Emoji & Activity Text */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <span className="text-base shrink-0 leading-tight">{todo.icon}</span>
                                  <p
                                    className={`text-xs sm:text-[13px] font-bold leading-snug transition-all ${
                                      todo.completed
                                        ? 'line-through text-slate-400 font-medium'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    {todo.text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- ABOUT US SECTION -------------------- */}
      <section id="about-us" className="py-20 bg-slate-50/70 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual element */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white p-3 border border-slate-200/60">
                <img
                  src="/earth-leaves.jpg"
                  alt="Terra AI Ecological Mission"
                  className="w-full h-auto rounded-2xl object-cover hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      🌍
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Unified Ecological Action</h4>
                      <p className="text-xs text-slate-500">Community-driven, AI-accelerated sustainability</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text description */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>About Our Ecosystem</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#133e24] tracking-tight">
                Empowering Everyday Humans to Protect Our Shared Home
              </h2>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                Terra AI bridges individual actions with planetary scale results. We believe saving our climate doesn't happen through guilt—it happens through rewarding daily habits, vibrant circular communities, and transparent intelligence.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">Verified Positive Actions</h5>
                    <p className="text-xs text-slate-500 mt-0.5">Every tree planted or habit logged is peer-reviewed and rewarded.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Globe2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-800">Zero-Waste Marketplace</h5>
                    <p className="text-xs text-slate-500 mt-0.5">Trade, gift, and upcycle resources freely to eliminate landfill waste.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-6 py-3 rounded-full text-sm font-bold bg-[#133e24] text-white hover:bg-emerald-900 transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Discover Platform Capabilities</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FEATURES SECTION -------------------- */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold">
              <span>Platform Capabilities</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#133e24] tracking-tight">
              Integrated Tools Built for Measurable Climate Impact
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Discover our connected suite of sustainability tools designed to take you from carbon-conscious to net-zero champion.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.id}
                  className="p-7 rounded-3xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-emerald-800 transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------- OUR WORK SECTION (Stats & Impact) -------------------- */}
      <section id="our-work" className="py-20 bg-emerald-900 text-white relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 border border-emerald-700/60">
              Measurable Progress
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
              Our Community's Collective Impact
            </h2>
            <p className="text-emerald-200/90 text-base sm:text-lg">
              Here is what happens when thousands of people combine small daily actions.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-4xl sm:text-5xl font-black text-emerald-300 mb-2">142,500</div>
              <div className="text-sm font-bold text-white mb-1">Kilograms CO₂ Saved</div>
              <div className="text-xs text-emerald-300/70">Verified through daily tracker logs</div>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-4xl sm:text-5xl font-black text-emerald-300 mb-2">12,450</div>
              <div className="text-sm font-bold text-white mb-1">Trees Planted</div>
              <div className="text-xs text-emerald-300/70">Funded via community EcoPoints</div>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-4xl sm:text-5xl font-black text-emerald-300 mb-2">28,900</div>
              <div className="text-sm font-bold text-white mb-1">Items Swapped & Saved</div>
              <div className="text-xs text-emerald-300/70">Kept out of municipal landfills</div>
            </div>

            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xs">
              <div className="text-4xl sm:text-5xl font-black text-emerald-300 mb-2">48,200+</div>
              <div className="text-sm font-bold text-white mb-1">Active Eco-Warriors</div>
              <div className="text-xs text-emerald-300/70">Across 64 countries worldwide</div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- CONTACT SECTION -------------------- */}
      <section id="contact" className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl">
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 text-xs font-bold mb-3">
                <span>Get In Touch</span>
              </div>
              <h2 className="text-3xl font-black text-[#133e24] tracking-tight">
                Partner with Terra AI Ecology
              </h2>
              <p className="text-slate-600 text-sm mt-2">
                Have questions about enterprise partnerships, local tree-planting drives, or AI sustainability audits?
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); alert('Thank you for reaching out! Our eco team will respond within 24 hours.'); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Message</label>
                <textarea
                  rows="4"
                  required
                  placeholder="Tell us about your organization or project..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                />
              </div>

              <div className="text-center pt-2">
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-full text-sm font-bold bg-[#133e24] text-white hover:bg-emerald-800 transition-colors cursor-pointer shadow-md"
                >
                  Send Message
                </button>
              </div>
            </form>

            {/* Social Logos at Bottom of Contact Card */}
            <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Connect With Terra AI
              </span>
              <div className="flex items-center gap-3">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-[#1DA1F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                  title="Twitter"
                  aria-label="Twitter"
                >
                  <TwitterIcon className="w-4 h-4 fill-current" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 hover:text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                  title="Instagram"
                  aria-label="Instagram"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                  title="Facebook"
                  aria-label="Facebook"
                >
                  <FacebookIcon className="w-4 h-4 fill-current" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-black hover:text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xs cursor-pointer"
                  title="X"
                  aria-label="X"
                >
                  <XSocialIcon className="w-3.5 h-3.5 fill-current" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="bg-white border-t border-slate-200/80 py-12 text-slate-600 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
            {/* Logo */}
            <div 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center cursor-pointer group"
              title="TERRA AI"
            >
              <img 
                src="/terra-ai-logo.svg" 
                alt="TERRA AI Logo" 
                className="h-10 w-auto object-contain rounded-lg" 
              />
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-slate-600">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-emerald-800 cursor-pointer">Home</button>
              <button onClick={() => scrollToSection('about-us')} className="hover:text-emerald-800 cursor-pointer">About Us</button>
              <button onClick={() => scrollToSection('features')} className="hover:text-emerald-800 cursor-pointer">Features</button>
              <button onClick={() => scrollToSection('our-work')} className="hover:text-emerald-800 cursor-pointer">Our Work</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-emerald-800 cursor-pointer">Contact</button>
            </div>

            {/* Social Logos in Footer */}
            <div className="flex items-center gap-2.5">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-[#1DA1F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Twitter"
                aria-label="Twitter"
              >
                <TwitterIcon className="w-3.5 h-3.5 fill-current" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Instagram"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Facebook"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-3.5 h-3.5 fill-current" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-black hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="X"
                aria-label="X"
              >
                <XSocialIcon className="w-3 h-3 fill-current" />
              </a>
            </div>
          </div>

          <div className="pt-8 text-center text-xs text-slate-400">
            <p>© {new Date().getFullYear()} Terra AI Ecology. All rights reserved. Small actions, big impact.</p>
          </div>
        </div>
      </footer>

      {/* -------------------- MODAL: DONATE -------------------- */}
      {activeModal === 'donate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {donationSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
                  🌱
                </div>
                <h3 className="text-2xl font-black text-slate-800">Thank You, Eco-Champion!</h3>
                <p className="text-sm text-slate-600">
                  Your donation of <strong>${donationAmount}</strong> directly funds our <strong>{donationInitiative === 'trees' ? '5 Native Tree Planting' : donationInitiative === 'ocean' ? 'Marine Plastic Cleanup' : 'Urban Solar Project'}</strong> initiative!
                </p>
              </div>
            ) : (
              <div>
                <img src="/terra-ai-logo.svg" alt="TERRA AI" className="h-9 w-auto mb-3" />
                <div className="flex items-center gap-2 mb-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <Heart className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                  <span>Support The Planet</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-1">Make a Direct Impact</h3>
                <p className="text-xs text-slate-500 mb-6">100% of community contributions go directly to verified environmental projects.</p>

                <form onSubmit={handleDonateSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Select Initiative</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'trees', label: 'Plant Trees', icon: TreePine },
                        { id: 'ocean', label: 'Clean Oceans', icon: Droplets },
                        { id: 'solar', label: 'Clean Energy', icon: Sun },
                      ].map((init) => {
                        const Icon = init.icon;
                        const isSelected = donationInitiative === init.id;
                        return (
                          <button
                            type="button"
                            key={init.id}
                            onClick={() => setDonationInitiative(init.id)}
                            className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-xs'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span className="text-[11px]">{init.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Donation Amount</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((amt) => (
                        <button
                          type="button"
                          key={amt}
                          onClick={() => setDonationAmount(amt)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            donationAmount === amt
                              ? 'bg-emerald-800 text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-colors cursor-pointer"
                  >
                    Contribute ${donationAmount} Now
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL: JOIN US -------------------- */}
      {activeModal === 'join' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {joinSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
                  🎉
                </div>
                <h3 className="text-2xl font-black text-slate-800">Welcome to Terra AI!</h3>
                <p className="text-sm text-slate-600">
                  You earned <strong className="text-emerald-700">+50 Welcome EcoPoints</strong>! Launching the main platform now...
                </p>
              </div>
            ) : (
              <div>
                <img src="/terra-ai-logo.svg" alt="TERRA AI" className="h-9 w-auto mb-3" />
                <div className="flex items-center gap-2 mb-2 text-sky-800 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>Join The Movement</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-1">Become an Eco-Warrior</h3>
                <p className="text-xs text-slate-500 mb-6">Track your personal carbon footprint, swap circular goods, and join local initiatives.</p>

                <form onSubmit={handleJoinSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={joinForm.name}
                      onChange={(e) => setJoinForm({ ...joinForm, name: e.target.value })}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={joinForm.email}
                      onChange={(e) => setJoinForm({ ...joinForm, email: e.target.value })}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Climate Goal</label>
                    <select
                      value={joinForm.interest}
                      onChange={(e) => setJoinForm({ ...joinForm, interest: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-emerald-600 text-sm"
                    >
                      <option value="climate">Reduce Household Carbon Footprint</option>
                      <option value="waste">Zero-Waste & Circular Goods Exchange</option>
                      <option value="diet">Plant-Forward Nutrition & Local Food</option>
                      <option value="community">Community Beach & Forest Cleanups</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Join Now & Claim 50 EcoPoints
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL: OUR APPROACH -------------------- */}
      {activeModal === 'approach' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#cad98d]/50 text-[#1c381c] text-xs font-bold mb-3">
              <span>Framework & Methodology</span>
            </div>
            <h3 className="text-3xl font-black text-[#133e24] mb-3">Our 4-Pillar Approach</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Real environmental change isn't created by a handful of people doing sustainability perfectly. It's millions doing it imperfectly every single day.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#eff9ea] border border-emerald-200/70 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">1</span>
                <div>
                  <h4 className="font-bold text-base text-[#133e24]">Measure Daily Footprint</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Granular tracking across commute, dietary choices, energy usage, and household consumption with real-time feedback.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#edf7fc] border border-sky-200/70 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-sky-700 text-white flex items-center justify-center font-bold text-sm shrink-0">2</span>
                <div>
                  <h4 className="font-bold text-base text-[#123c59]">AI-Powered Personalized Reduction</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Tailored micro-actions recommended by Google Gemini AI that fit your lifestyle without drastic inconvenience.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#edf9f8] border border-teal-200/70 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-sm shrink-0">3</span>
                <div>
                  <h4 className="font-bold text-base text-[#144243]">Circular Eco Exchange</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Free upcycling and peer-to-peer equipment sharing, diverting usable goods from landfills into caring homes.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-start gap-4">
                <span className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">4</span>
                <div>
                  <h4 className="font-bold text-base text-amber-900">Gamified Community Inspiration</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Earn EcoPoints, unlock achievements, climb local leaderboards, and turn virtual actions into real planted trees.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setActiveModal(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
              <button
                onClick={() => { setActiveModal(null); onExplore(); }}
                className="px-6 py-3 rounded-full text-sm font-bold bg-[#133e24] text-white hover:bg-emerald-900 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>Experience the Approach Live</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: CARD DETAIL -------------------- */}
      {activeModal === 'card-detail' && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden mb-5 bg-slate-100">
              <img
                src={selectedCard.image}
                alt={selectedCard.title}
                className="w-full h-full object-cover"
              />
            </div>

            <span className={`text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full ${selectedCard.pillColor} inline-block mb-2`}>
              {selectedCard.badge}
            </span>

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {selectedCard.title}
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {selectedCard.description}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActiveModal(null);
                  onNavigate(selectedCard.targetTab);
                }}
                className="flex-1 py-3.5 rounded-full text-sm font-bold bg-[#133e24] text-white hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Explore in App</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-3.5 rounded-full text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
