/**
 * Centralized Design Tokens for the Bazar Mobile Application
 * Pixel-perfect match for the Bazar Zepto/Blinkit-style reference design system.
 */

export const BAZAR_THEME = {
  colors: {
    // Brand Greens
    primary: '#0D7C4D',
    primaryHover: '#0A663F',
    primarySoft: '#E8F5EE',
    primaryLight: '#F0FDF4',
    
    // Status & Badges
    emerald: '#10B981',
    emeraldSoft: '#ECFDF5',
    discountRed: '#EF4444',
    amber: '#F59E0B',
    amberSoft: '#FFFBEB',
    blue: '#1B84FF',
    blueSoft: '#E8F2FC',

    // Neutrals & Surfaces
    background: '#F8FAF9',
    surface: '#FFFFFF',
    surfaceSubtle: '#F3F5F4',
    inputBg: '#F2F4F3',
    border: '#E5E9E6',
    borderSubtle: '#EAEFEA',

    // Typography
    textPrimary: '#0F1713',
    textSecondary: '#525C56',
    textMuted: '#8A948D',
    textWhite: '#FFFFFF',
  },
  radius: {
    xs: '6px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  shadows: {
    card: '0 2px 8px rgba(0, 0, 0, 0.04)',
    floating: '0 8px 24px rgba(13, 124, 77, 0.25)',
    sheet: '0 -8px 32px rgba(0, 0, 0, 0.12)',
  }
} as const;

