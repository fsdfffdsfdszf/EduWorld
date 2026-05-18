
import React from 'react';
import { ThemeConfig } from '../types';

export const THEME_ACCENTS: Record<string, Record<string, string>> = {
  indigo: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
  winter: { 50: '#f0fbff', 100: '#def5ff', 200: '#b6ebff', 300: '#7ddcff', 400: '#32c5ff', 500: '#00a3ff', 600: '#0084ff', 700: '#0066ff', 800: '#0052cc', 900: '#0044aa', 950: '#002255' },
  eid: { 50: '#f2fdf5', 100: '#e1f9e9', 200: '#c5f2d4', 300: '#94e7af', 400: '#5ed684', 500: '#2fb35a', 600: '#229145', 700: '#1c7338', 800: '#1a5c2e', 900: '#164d27', 950: '#0b2613' }
};

export const THEME_BACKGROUNDS: Record<string, { main: string, surface: string }> = {
  slate: { main: '#020617', surface: '#0f172a' },
  zinc: { main: '#09090b', surface: '#18181b' },
  obsidian: { main: '#000000', surface: '#0a0a0a' },
  midnight: { main: '#020617', surface: '#070c1a' },
  arctic: { main: '#050b18', surface: '#0c162d' },
  royal: { main: '#04140b', surface: '#082415' }
};

export const ACCENT_OPTIONS: { id: ThemeConfig['accentColor'], color: string, icon?: string }[] = [
  { id: 'indigo', color: 'bg-indigo-600' },
  { id: 'emerald', color: 'bg-emerald-600' },
  { id: 'rose', color: 'bg-rose-600' },
  { id: 'amber', color: 'bg-amber-600' },
  { id: 'violet', color: 'bg-violet-600' },
  { id: 'sky', color: 'bg-sky-600' },
  { id: 'fuchsia', color: 'bg-fuchsia-600' },
  { id: 'winter', color: 'bg-blue-300', icon: 'fa-snowflake' },
  { id: 'eid', color: 'bg-emerald-800', icon: 'fa-moon' }
];

export const BG_OPTIONS: { id: ThemeConfig['backgroundStyle'], label: string }[] = [
  { id: 'slate', label: 'Slate' },
  { id: 'zinc', label: 'Zinc' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'arctic', label: 'Arctic' },
  { id: 'royal', label: 'Royal' }
];

export const SeasonalEffects: React.FC<{ theme: ThemeConfig }> = ({ theme }) => {
  if (theme.accentColor === 'winter') {
    return (
      <div className="seasonal-overlay pointer-events-none fixed inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-white rounded-full animate-snowfall"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              animationDuration: `${Math.random() * 5 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.5 + 0.3
            }}
          />
        ))}
      </div>
    );
  }
  return null;
};
