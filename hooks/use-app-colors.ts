/**
 * useAppColors — central hook for all theme-reactive colors.
 * Call this inside any component; it re-renders when the user
 * switches light / dark / system in the Preferences screen.
 */

import { useEffectiveColorScheme } from '@/contexts/theme-context';

export function useAppColors() {
  const scheme = useEffectiveColorScheme() ?? 'dark';
  const isDark = scheme === 'dark';

  return {
    scheme,
    isDark,

    // ── Page / screen backgrounds ──────────────────────────────
    background:       isDark ? '#1e293b'                    : '#F1F5F9',
    backgroundDeep:   isDark ? '#0F172A'                    : '#E2E8F0',

    // ── Cards / elevated surfaces ──────────────────────────────
    card:             isDark ? 'rgba(255,255,255,0.04)'     : '#FFFFFF',
    cardBorder:       isDark ? 'rgba(255,255,255,0.08)'     : '#E2E8F0',
    cardElevated:     isDark ? 'rgba(255,255,255,0.07)'     : '#FFFFFF',

    // ── Text ───────────────────────────────────────────────────
    text:             isDark ? '#F8FAFC'                    : '#0F172A',
    textSecondary:    isDark ? '#CBD5E1'                    : '#475569',
    textMuted:        isDark ? '#64748B'                    : '#94A3B8',
    textLabel:        isDark ? 'rgba(255,255,255,0.4)'      : '#64748B',

    // ── Inputs ─────────────────────────────────────────────────
    inputBg:          isDark ? 'rgba(255,255,255,0.05)'     : '#FFFFFF',
    inputBorder:      isDark ? 'rgba(255,255,255,0.1)'      : '#CBD5E1',
    inputBorderFocus: isDark ? 'rgba(255,255,255,0.25)'     : '#2563EB',
    placeholder:      isDark ? 'rgba(255,255,255,0.3)'      : '#94A3B8',
    inputText:        isDark ? '#FFFFFF'                    : '#0F172A',

    // ── Borders / dividers ─────────────────────────────────────
    border:           isDark ? 'rgba(255,255,255,0.08)'     : '#E2E8F0',
    borderStrong:     isDark ? 'rgba(255,255,255,0.15)'     : '#CBD5E1',
    divider:          isDark ? 'rgba(255,255,255,0.05)'     : '#F1F5F9',

    // ── Buttons / action items ─────────────────────────────────
    actionItemBg:     isDark ? 'rgba(15,23,42,0.6)'         : '#FFFFFF',
    actionItemBorder: isDark ? 'rgba(255,255,255,0.05)'     : '#E2E8F0',
    actionIconWrap:   isDark ? 'rgba(255,255,255,0.05)'     : '#F1F5F9',

    // ── Hero / header gradients ────────────────────────────────
    heroGradient:     isDark
      ? (['#1E293B', '#0F172A', '#1e293b'] as const)
      : (['#E2E8F0', '#F1F5F9', '#FFFFFF'] as const),
    heroOverlayStart: isDark ? 'transparent'               : 'rgba(226,232,240,0.4)',
    heroGradientEnd:  isDark ? '#1e293b'                   : '#F1F5F9',

    // ── Modal / overlay ────────────────────────────────────────
    modalBg:          isDark ? '#1E293B'                    : '#FFFFFF',
    modalOverlay:     isDark ? 'rgba(0,0,0,0.8)'            : 'rgba(0,0,0,0.4)',

    // ── Misc ───────────────────────────────────────────────────
    backButton:       isDark ? 'rgba(255,255,255,0.1)'      : 'rgba(0,0,0,0.08)',
    backButtonIcon:   isDark ? '#FFFFFF'                    : '#0F172A',
    pickerButton:     isDark ? 'rgba(255,255,255,0.05)'     : '#FFFFFF',
  };
}
