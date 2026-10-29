import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ fallback = '/', label = 'Back', className = '' }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`group inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-900 transition-colors cursor-pointer ${className}`}
      title="Go back to previous page"
    >
      <div className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 shadow-2xs group-hover:shadow-xs group-hover:-translate-x-0.5 flex items-center justify-center transition-all">
        <ArrowLeft className="w-4 h-4 text-slate-700 group-hover:text-emerald-800 transition-colors" />
      </div>
      <span className="hidden sm:inline font-medium text-slate-700 group-hover:text-emerald-800 transition-colors">
        {label}
      </span>
    </button>
  );
}
