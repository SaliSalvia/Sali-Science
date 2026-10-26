/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]"
      >
        <defs>
          <linearGradient id="prismGradient" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0369A1" />
          </linearGradient>
          <linearGradient id="silverGradient" x1="0" y1="24" x2="48" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F1F5F9" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Hexagonal Shield */}
        <polygon
          points="24,3 43,14 43,34 24,45 5,34 5,14"
          stroke="url(#silverGradient)"
          strokeWidth="1.75"
          fill="#0B1528"
          strokeLinejoin="round"
        />

        {/* Inner Atomic / Neural Orbits */}
        <ellipse
          cx="24"
          cy="24"
          rx="15"
          ry="6"
          stroke="url(#prismGradient)"
          strokeWidth="1.4"
          transform="rotate(30 24 24)"
          strokeDasharray="2 1.5"
          opacity="0.85"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="15"
          ry="6"
          stroke="url(#prismGradient)"
          strokeWidth="1.4"
          transform="rotate(-30 24 24)"
          strokeDasharray="2 1.5"
          opacity="0.85"
        />

        {/* Central Luminous Core / Geometric Diamond */}
        <polygon
          points="24,14 32,24 24,34 16,24"
          fill="url(#prismGradient)"
          opacity="0.9"
        />

        {/* Radial Quantum Glow */}
        <circle cx="24" cy="24" r="5" fill="url(#coreGlow)" />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />

        {/* Micro Sensor Nodes */}
        <circle cx="24" cy="5" r="1.5" fill="#38BDF8" />
        <circle cx="41.5" cy="15" r="1.5" fill="#38BDF8" />
        <circle cx="41.5" cy="33" r="1.5" fill="#38BDF8" />
        <circle cx="24" cy="43" r="1.5" fill="#38BDF8" />
        <circle cx="6.5" cy="33" r="1.5" fill="#38BDF8" />
        <circle cx="6.5" cy="15" r="1.5" fill="#38BDF8" />
      </svg>
    </div>
  );
};
