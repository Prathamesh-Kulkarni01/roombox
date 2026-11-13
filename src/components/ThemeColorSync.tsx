'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

// Matching mobile browser status bar colors for each theme
const THEME_PWA_COLORS: Record<string, { light: string; dark: string }> = {
  rose: { light: '#FFF1F2', dark: '#1F1116' },
  green: { light: '#F0FDF4', dark: '#0C1B13' },
  violet: { light: '#F5F3FF', dark: '#150F24' },
  saffron: { light: '#FFF7ED', dark: '#1C120C' },
  blue: { light: '#EFF6FF', dark: '#0B1526' },
  dark: { light: '#0B1320', dark: '#0B1320' },
  light: { light: '#F8FAFC', dark: '#0F172A' },
};

export function ThemeColorSync() {
  const { resolvedTheme, theme } = useTheme();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentTheme = theme || resolvedTheme || 'rose';
    const isDark = document.documentElement.classList.contains('dark') || currentTheme === 'dark';
    const themeConfig = THEME_PWA_COLORS[currentTheme] || THEME_PWA_COLORS.rose;
    const activeColor = isDark ? themeConfig.dark : themeConfig.light;

    // Update <meta name="theme-color"> for Chrome, Android, Edge, Samsung Internet
    let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', activeColor);

    // Update Apple Mobile Web App Status Bar Style
    let appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusMeta) {
      appleStatusMeta = document.createElement('meta');
      appleStatusMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleStatusMeta);
    }
    appleStatusMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');

    // Also update any media-query specific theme-color tags
    const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]');
    if (lightMeta) lightMeta.setAttribute('content', themeConfig.light);

    const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]');
    if (darkMeta) darkMeta.setAttribute('content', themeConfig.dark);
  }, [theme, resolvedTheme]);

  return null;
}
