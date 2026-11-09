import { useState, useEffect } from 'react';
import { Megaphone, Bell, Calendar, Sparkles, AlertCircle, Building2, Shield, RefreshCw } from 'lucide-react';

export default function AnnouncementsFeed({ className = '', title, emptyMessage }) {
  const [announcements, setAnnouncements] = useState([]);
  const [scope, setScope] = useState('PLATFORM');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/announcements', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
        setScope(data.scope || 'PLATFORM');
        setOrgName(data.organization_name || '');
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className={`p-6 rounded-3xl bg-slate-50 border border-slate-200 animate-pulse ${className}`}>
        <div className="h-5 w-48 bg-slate-200 rounded-lg mb-3" />
        <div className="h-16 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (announcements.length === 0) {
    if (emptyMessage) {
      return (
        <div className={`p-6 rounded-3xl bg-white border border-slate-200 text-center text-slate-500 text-sm ${className}`}>
          <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>{emptyMessage}</p>
        </div>
      );
    }
    return null;
  }

  const isOrg = scope === 'ORGANIZATION';
  const defaultTitle = isOrg
    ? `Official Announcements • ${orgName || 'Organization'}`
    : 'Platform Announcements • Terra AI';

  return (
    <div className={`space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isOrg ? 'bg-teal-100 text-teal-800' : 'bg-emerald-100 text-emerald-800'
          }`}>
            <Megaphone className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            {title || defaultTitle}
          </h2>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isOrg
            ? 'bg-teal-50 text-teal-700 border-teal-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {isOrg ? 'Organization Broadcast' : 'Public Announcement'}
        </span>
      </div>

      <div className="space-y-3">
        {announcements.map((item) => (
          <article
            key={item.id}
            className={`p-4 sm:p-5 rounded-2xl border transition shadow-sm ${
              item.priority === 'URGENT'
                ? 'bg-amber-50/60 border-amber-200/80 hover:border-amber-300'
                : isOrg
                ? 'bg-teal-50/30 border-teal-100 hover:border-teal-200'
                : 'bg-white border-slate-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    item.category === 'EVENT'
                      ? 'bg-blue-100 text-blue-800'
                      : item.category === 'ECO_CAMPAIGN'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.category === 'URGENT'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.category?.replace('_', ' ') || 'GENERAL'}
                </span>
                {item.priority === 'URGENT' && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    <AlertCircle className="w-3 h-3" /> Priority Notice
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1.5 leading-snug">
              {item.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                {item.scope === 'ORGANIZATION' ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Posted by {item.author_name}</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Posted by {item.author_name} (Terra AI)</span>
                  </>
                )}
              </span>
              <span className="text-slate-400">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

