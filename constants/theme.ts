/**
 * Comprehensive Light / Dark theme token system.
 * Dark  = current navy/slate premium dark mode (default)
 * Light = clean white/slate professional mode
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Backgrounds
    background:        '#F1F5F9',   // slate-100
    surface:           '#FFFFFF',   // cards / sheets
    surfaceElevated:   '#FFFFFF',
    surfaceMuted:      '#F8FAFC',

    // Text
    text:              '#0F172A',   // slate-900
    textSecondary:     '#475569',   // slate-600
    textMuted:         '#94A3B8',   // slate-400
    textInverse:       '#FFFFFF',

    // Borders & dividers
    border:            '#E2E8F0',   // slate-200
    borderStrong:      '#CBD5E1',   // slate-300
    divider:           '#F1F5F9',

    // Interactive
    tint:              '#2563EB',   // blue-600
    icon:              '#475569',
    tabIconDefault:    '#94A3B8',
    tabIconSelected:   '#2563EB',

    // Inputs
    inputBg:           '#FFFFFF',
    inputBorder:       '#CBD5E1',
    placeholder:       '#94A3B8',

    // Hero / header
    heroOverlay:       'rgba(241,245,249,0.92)',
  },

  dark: {
    // Backgrounds
    background:        '#1e293b',   // slate-800  (was navy)
    surface:           'rgba(255,255,255,0.04)',
    surfaceElevated:   'rgba(255,255,255,0.07)',
    surfaceMuted:      'rgba(255,255,255,0.02)',

    // Text
    text:              '#F8FAFC',   // slate-50
    textSecondary:     '#CBD5E1',   // slate-300
    textMuted:         '#64748B',   // slate-500
    textInverse:       '#0F172A',

    // Borders & dividers
    border:            'rgba(255,255,255,0.08)',
    borderStrong:      'rgba(255,255,255,0.15)',
    divider:           'rgba(255,255,255,0.05)',

    // Interactive
    tint:              '#FACC15',   // gold accent
    icon:              '#94A3B8',
    tabIconDefault:    '#64748B',
    tabIconSelected:   '#FACC15',

    // Inputs
    inputBg:           'rgba(255,255,255,0.05)',
    inputBorder:       'rgba(255,255,255,0.1)',
    placeholder:       'rgba(255,255,255,0.3)',

    // Hero / header
    heroOverlay:       'rgba(15,23,42,0.85)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
