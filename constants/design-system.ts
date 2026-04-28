import { StyleSheet } from 'react-native';

export const Colors = {
  primary: { main: '#2563EB', light: '#3B82F6', dark: '#1E40AF', lighter: '#DBEAFE', lightest: '#F0F9FF' },
  secondary: { main: '#10B981', light: '#34D399', dark: '#059669', lighter: '#D1FAE5', lightest: '#F0FDF4' },
  accent: { gold: '#FACC15', navy: '#1e293b', slate: '#475569' },
  success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
  neutral: { 900: '#111827', 800: '#1F2937', 700: '#374151', 600: '#4B5563', 500: '#6B7280', 400: '#9CA3AF', 300: '#D1D5DB', 200: '#E5E7EB', 100: '#F3F4F6', 50: '#F9FAFB', white: '#FFFFFF', black: '#000000' },
  background: { primary: '#FFFFFF', secondary: '#F9FAFB', tertiary: '#F3F4F6', dark: '#1e293b', darkElevated: '#334155' },
  text: { primary: '#111827', secondary: '#4B5563', tertiary: '#9CA3AF', inverse: '#FFFFFF', gold: '#FACC15' },
  border: '#E5E7EB', shadow: '#000000',
};

export const Typography = {
  fontFamily: { regular: 'System', medium: 'System', semibold: 'System', bold: 'System' },
  fontSize: { xs: 10, sm: 12, base: 14, lg: 16, xl: 18, '2xl': 22, '3xl': 28, '4xl': 34 },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75, loose: 2 },
  fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
  styles: {
    h1: { fontSize: 34, fontWeight: '700', lineHeight: 40 },
    h2: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
    h3: { fontSize: 22, fontWeight: '600', lineHeight: 30 },
    h4: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
    h5: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
    bodyLarge: { fontSize: 14, fontWeight: '400', lineHeight: 22 },
    bodyLargeMedium: { fontSize: 14, fontWeight: '500', lineHeight: 22 },
    bodyLargeSemibold: { fontSize: 14, fontWeight: '600', lineHeight: 22 },
    bodyMedium: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
    bodyMediumMedium: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
    bodyMediumSemibold: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
    bodySmall: { fontSize: 10, fontWeight: '400', lineHeight: 16 },
    bodySmallMedium: { fontSize: 10, fontWeight: '500', lineHeight: 16 },
    bodySmallSemibold: { fontSize: 10, fontWeight: '600', lineHeight: 16 },
    label: { fontSize: 10, fontWeight: '600', lineHeight: 14, letterSpacing: 0.5 },
    caption: { fontSize: 10, fontWeight: '400', lineHeight: 16 },
  },
};

export const Spacing = { xs: 3, sm: 6, md: 10, lg: 14, xl: 18, '2xl': 22, '3xl': 30, '4xl': 38, '5xl': 46, '6xl': 54, '7xl': 62 };

export const Shadows = StyleSheet.create({
  none: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  lg: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  xl: { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 6 },
  '2xl': { shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  premium: { shadowColor: '#2563EB', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 }
});

export const BorderRadius = { none: 0, sm: 3, md: 6, lg: 10, xl: 14, '2xl': 18, '3xl': 22, '4xl': 30, '5xl': 42, full: 9999 };

export const ButtonStyles: any = {
  primary: {
    container: { backgroundColor: Colors.primary.main, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46, ...Shadows.md },
    text: { color: Colors.text.inverse, fontWeight: '600', fontSize: Typography.fontSize.base },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
  },
  secondary: {
    container: { backgroundColor: Colors.secondary.main, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46, ...Shadows.md },
    text: { color: Colors.text.inverse, fontWeight: '600', fontSize: Typography.fontSize.base },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.5 },
  },
  outline: {
    container: { backgroundColor: Colors.background.primary, borderWidth: 2, borderColor: Colors.primary.main, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
    text: { color: Colors.primary.main, fontWeight: '600', fontSize: Typography.fontSize.base },
    pressed: { backgroundColor: Colors.primary.lightest },
    disabled: { opacity: 0.5 },
  },
  ghost: {
    container: { backgroundColor: 'transparent', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
    text: { color: Colors.primary.main, fontWeight: '600', fontSize: Typography.fontSize.base },
    pressed: { backgroundColor: Colors.primary.lightest },
    disabled: { opacity: 0.5 },
  },
  premium: {
    container: { backgroundColor: Colors.primary.main, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', minHeight: 52, ...Shadows.premium },
    text: { color: Colors.neutral.white, fontWeight: '800', fontSize: Typography.fontSize.base, letterSpacing: 0.5, textTransform: 'uppercase' },
    pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    disabled: { opacity: 0.5, backgroundColor: Colors.neutral['900'] },
  },
};

export const InputStyle: any = {
  container: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: Typography.fontSize.base, color: Colors.text.primary, minHeight: 46 },
  placeholder: Colors.text.tertiary,
  focused: { borderColor: Colors.primary.main, borderWidth: 2 },
  error: { borderColor: Colors.error, borderWidth: 2 },
};

export const CardStyle: any = {
  container: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadows.md },
  containerSmall: { backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.sm },
  containerSubtle: { backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.lg, padding: Spacing.lg },
};

export const AlertStyle: any = {
  success: { container: { backgroundColor: Colors.secondary.lightest, borderLeftColor: Colors.secondary.main, borderLeftWidth: 4, borderRadius: BorderRadius.lg, padding: Spacing.lg }, text: { color: Colors.secondary.dark } },
  error: { container: { backgroundColor: '#FEE2E2', borderLeftColor: Colors.error, borderLeftWidth: 4, borderRadius: BorderRadius.lg, padding: Spacing.lg }, text: { color: '#991B1B' } },
  warning: { container: { backgroundColor: '#FEF3C7', borderLeftColor: Colors.warning, borderLeftWidth: 4, borderRadius: BorderRadius.lg, padding: Spacing.lg }, text: { color: '#92400E' } },
  info: { container: { backgroundColor: Colors.primary.lightest, borderLeftColor: Colors.primary.main, borderLeftWidth: 4, borderRadius: BorderRadius.lg, padding: Spacing.lg }, text: { color: Colors.primary.dark } },
};

export const Animation = { fast: 150, normal: 250, slow: 350, slower: 500 };
