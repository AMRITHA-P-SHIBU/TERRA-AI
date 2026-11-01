/**
 * AvatarCircle.jsx
 * Reusable glowing green avatar circle component.
 * Shows the user's first initial (or profile picture if available).
 * Used in the top bar and profile header.
 */
import React from 'react';

export default function AvatarCircle({
  fullName = '',
  avatarUrl = null,
  size = 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  onClick = null,
  className = '',
  pulse = false,
}) {
  const initial = (fullName || '?').charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-24 h-24 text-4xl',
  };

  const glowStyle = {
    boxShadow: '0 0 0 3px rgba(52,211,153,0.25), 0 0 16px 4px rgba(52,211,153,0.18)',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={fullName ? `${fullName}'s profile` : 'Profile'}
      className={`
        relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center
        bg-gradient-to-br from-emerald-400 to-teal-500
        font-extrabold text-white select-none
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-110 hover:shadow-[0_0_0_4px_rgba(52,211,153,0.4),0_0_24px_6px_rgba(52,211,153,0.25)]' : 'cursor-default'}
        ${pulse ? 'animate-pulse' : ''}
        ${sizeClasses[size] || sizeClasses.md}
        ${className}
      `}
      style={glowStyle}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={fullName}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      ) : (
        <span>{initial}</span>
      )}
    </button>
  );
}

