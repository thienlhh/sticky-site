import * as React from 'react';

export function StickySiteLogo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoTapeTop" x1="24" y1="20" x2="104" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="70%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        <linearGradient id="logoTapeMid" x1="26" y1="36" x2="102" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="50%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        <linearGradient id="logoTapeBottom" x1="104" y1="80" x2="24" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="40%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        <linearGradient id="logoTapeSheen" x1="30" y1="24" x2="96" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>

        <filter id="logoShadow" x="-15%" y="-15%" width="130%" height="135%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>

        <filter id="logoFoldShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="#091E42" floodOpacity="0.4" />
        </filter>
      </defs>

      <g filter="url(#logoShadow)">
        <path
          d="M 68 80 L 96 80 C 102 80 106 84 106 90 L 106 96 C 106 102 102 106 96 106 L 32 106 L 26 100 L 32 94 L 26 88 L 32 82 L 26 80 L 68 80 Z"
          fill="url(#logoTapeBottom)"
        />

        <line x1="44" y1="93" x2="88" y2="93" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="54" cy="93" r="5.5" fill="#FFFFFF" />
        <circle cx="54" cy="93" r="2.5" fill="#2563EB" />
        <circle cx="70" cy="93" r="3.2" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="84" cy="93" r="3.2" fill="#FFFFFF" fillOpacity="0.65" />

        <path
          d="M 22 42 C 22 36 26 30 34 26 L 44 26 L 104 86 C 106 88 106 94 102 98 L 94 104 L 24 46 C 22 44 22 43 22 42 Z"
          fill="url(#logoTapeMid)"
          filter="url(#logoFoldShadow)"
        />

        <path
          d="M 24 38 C 24 30 30 22 38 22 L 96 22 L 102 28 L 96 34 L 102 40 L 96 46 L 102 48 L 38 48 C 30 48 24 44 24 38 Z"
          fill="url(#logoTapeTop)"
        />

        <path
          d="M 38 23.5 L 94 23.5"
          stroke="url(#logoTapeSheen)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <line x1="42" y1="35" x2="86" y2="35" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="48" cy="35" r="3.2" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="62" cy="35" r="3.2" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="78" cy="35" r="5.5" fill="#FFFFFF" />
        <circle cx="78" cy="35" r="2.5" fill="#2563EB" />
      </g>
    </svg>
  );
}
