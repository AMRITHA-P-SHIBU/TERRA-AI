import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GreenFeed from './components/GreenFeed';
import EcoExchange from './components/EcoExchange';
import CarbonCalculator from './components/CarbonCalculator';
import AIAssistant from './components/AIAssistant';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';

import { 
  currentUser as initialUser, 
  initialFeedPosts, 
  initialMarketplaceItems, 
  badgesData, 
  leaderboardData, 
  initialAiSuggestions 
} from './data/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [posts, setPosts] = useState(initialFeedPosts);
  const [marketplaceItems, setMarketplaceItems] = useState(initialMarketplaceItems);
  const [badges, setBadges] = useState(badgesData);
  const [leaderboard, setLeaderboard] = useState(leaderboardData);

  const [connectionStatus, setConnectionStatus] = useState({
    status: 'checking',
    message: 'Checking server connection...',
    supabase: { status: 'checking', message: 'Checking Supabase...' },
  });

  // Verify backend and Supabase connectivity
  useEffect(() => {
    const controller = new AbortController();

    async function checkServer() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        const health = await response.json();
        setConnectionStatus({
          status: 'connected',
          message: 'Server connected',
          supabase: health.supabase || { status: 'connected', message: 'Connected' },
        });
      } catch (error) {
        if (error.name === 'AbortError') return;

        setConnectionStatus({
          status: 'disconnected',
          message: error instanceof Error ? error.message : 'Backend offline',
          supabase: { status: 'disconnected', message: 'Server unavailable' },
        });
      }
    }

    checkServer();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        connectionStatus={connectionStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'feed' && (
          <GreenFeed
            posts={posts}
            setPosts={setPosts}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'exchange' && (
          <EcoExchange
            items={marketplaceItems}
            setItems={setMarketplaceItems}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'calculator' && (
          <CarbonCalculator
            currentUser={currentUser}
          />
        )}

        {activeTab === 'ai' && (
          <AIAssistant
            initialSuggestions={initialAiSuggestions}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard
            currentUser={currentUser}
            badges={badges}
            leaderboard={leaderboard}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            posts={posts}
            setPosts={setPosts}
            items={marketplaceItems}
            setItems={setMarketplaceItems}
          />
        )}
      </main>

      {/* Global Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Terra AI — EcoSphere Environmental Management</span>
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <button onClick={() => setActiveTab('feed')} className="hover:text-emerald-700 cursor-pointer">GreenFeed</button>
            <button onClick={() => setActiveTab('exchange')} className="hover:text-emerald-700 cursor-pointer">Eco Exchange</button>
            <button onClick={() => setActiveTab('calculator')} className="hover:text-emerald-700 cursor-pointer">Carbon Tracker</button>
            <button onClick={() => setActiveTab('ai')} className="hover:text-emerald-700 cursor-pointer">AI Assistant</button>
            <button onClick={() => setActiveTab('admin')} className="text-teal-700 hover:underline cursor-pointer">Admin Portal</button>
          </div>
          <p className="text-slate-400">
            Powered by React, Express, Supabase & Gemini AI
          </p>
        </div>
      </footer>
    </div>
  );
}