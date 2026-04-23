import { StyleSheet } from 'react-native';

/**
 * Modern, comprehensive design system for the Sabino School Portal
 * Ensures consistency, beauty, and professional appearance across all screens
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const Colors = {
  // Primary Brand Colors
  primary: {
    main: '#2563EB', // Modern Blue
    light: '#3B82F6',
    dark: '#1E40AF',
    lighter: '#DBEAFE',
    lightest: '#F0F9FF',
  },

  // Secondary/Accent Colors
  secondary: {
    main: '#10B981', // Modern Green
    light: '#34D399',
    dark: '#059669',
    lighter: '#D1FAE5',
    lightest: '#F0FDF4',
  },

  // Premium Accent Colors
  accent: {
    gold: '#FACC15',
    navy: '#0F172A',
    slate: '#1E293B',
  },

  // Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral Colors
  neutral: {
    900: '#111827',
    800: '#1F2937',
    700: '#374151',
    600: '#4B5563',
    500: '#6B7280',
    400: '#9CA3AF',
    300: '#D1D5DB',
    200: '#E5E7EB',
    100: '#F3F4F6',
    50: '#F9FAFB',
    white: '#FFFFFF',
    black: '#000000',
  },

  // Semantic Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
    dark: '#0F172A',
    darkElevated: '#1E293B',
  },

  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    gold: '#FACC15',
  },

  border: '#E5E7EB',
  shadow: '#000000',
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Predefined Styles
  styles: {
    // Display/Hero
    h1: {
      fontSize: 36,
      fontWeight: '700',
      lineHeight: 44,
    },
    h2: {
      fontSize: 30,
      fontWeight: '700',
      lineHeight: 36,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },

    // Section Headers
    h4: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h5: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
    },

    // Body Text
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodyLargeMedium: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    },
    bodyLargeSemibold: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
    },

    bodyMedium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    bodyMediumMedium: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
    },
    bodyMediumSemibold: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },

    // Small Text
    bodySmall: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
    },
    bodySmallMedium: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
    },
    bodySmallSemibold: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 18,
    },

    // Labels & Captions
    label: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      letterSpacing: 0.5,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 18,
    },
  },
};

// ============================================================================
// SPACING SYSTEM (8px base unit)
// ============================================================================
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 56,
  '7xl': 64,
};

// ============================================================================
// SHADOWS & ELEVATION
// ============================================================================
export const Shadows = StyleSheet.create({
  none: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  '2xl': {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  premium: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  }
});

// ============================================================================
// BORDER RADIUS
// ============================================================================
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 45,
  full: 9999,
};

// ============================================================================
// COMPONENT STYLING
// ============================================================================

// Button Preset Styles
export const ButtonStyles = {
  primary: {
    container: {
      backgroundColor: Colors.primary.main,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      alignItems: 'center' as any,
      justifyContent: 'center' as any,
      minHeight: 50,
      ...Shadows.md,
    },
    text: {
      color: Colors.text.inverse,
      fontWeight: '600' as any,
      fontSize: Typography.fontSize.base,
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.5,
    },
  },

  secondary: {
    container: {
      backgroundColor: Colors.secondary.main,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      alignItems: 'center' as any,
      justifyContent: 'center' as any,
      minHeight: 50,
      ...Shadows.md,
    },
    text: {
      color: Colors.text.inverse,
      fontWeight: '600' as any,
      fontSize: Typography.fontSize.base,
    },
    pressed: {
      opacity: 0.85,
    },
    disabled: {
      opacity: 0.5,
    },
  },

  outline: {
    container: {
      backgroundColor: Colors.background.primary,
      borderWidth: 2,
      borderColor: Colors.primary.main,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      alignItems: 'center' as any,
      justifyContent: 'center' as any,
      minHeight: 50,
    },
    text: {
      color: Colors.primary.main,
      fontWeight: '600' as any,
      fontSize: Typography.fontSize.base,
    },
    pressed: {
      backgroundColor: Colors.primary.lightest,
    },
    disabled: {
      opacity: 0.5,
    },
  },

  ghost: {
    container: {
      backgroundColor: 'transparent',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.lg,
      alignItems: 'center' as any,
      justifyContent: 'center' as any,
      minHeight: 50,
    },
    text: {
      color: Colors.primary.main,
      fontWeight: '600' as any,
      fontSize: Typography.fontSize.base,
    },
    pressed: {
      backgroundColor: Colors.primary.lightest,
    },
    disabled: {
      opacity: 0.5,
    },
  },

  premium: {
    container: {
      backgroundColor: Colors.primary.main,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.xl, // More rounded for premium
      alignItems: 'center' as any,
      justifyContent: 'center' as any,
      flexDirection: 'row' as any,
      minHeight: 56,
      ...Shadows.premium,
    },
    text: {
      color: Colors.neutral.white,
      fontWeight: '800' as any,
      fontSize: Typography.fontSize.base,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as any,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.5,
      backgroundColor: Colors.neutral['900'],
    },
  },
};

// Input/TextInput Preset Style
export const InputStyle = {
  container: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    minHeight: 50,
  },
  placeholder: Colors.text.tertiary,
  focused: {
    borderColor: Colors.primary.main,
    borderWidth: 2,
  },
  error: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
};

// Card/Container Preset Style
export const CardStyle = {
  container: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  containerSmall: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  containerSubtle: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
};

// Alert/Message Box Styles
export const AlertStyle = {
  success: {
    container: {
      backgroundColor: Colors.secondary.lightest,
      borderLeftColor: Colors.secondary.main,
      borderLeftWidth: 4,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    text: {
      color: Colors.secondary.dark,
    },
  },
  error: {
    container: {
      backgroundColor: '#FEE2E2',
      borderLeftColor: Colors.error,
      borderLeftWidth: 4,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    text: {
      color: '#991B1B',
    },
  },
  warning: {
    container: {
      backgroundColor: '#FEF3C7',
      borderLeftColor: Colors.warning,
      borderLeftWidth: 4,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    text: {
      color: '#92400E',
    },
  },
  info: {
    container: {
      backgroundColor: Colors.primary.lightest,
      borderLeftColor: Colors.primary.main,
      borderLeftWidth: 4,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    text: {
      color: Colors.primary.dark,
    },
  },
};

// ============================================================================
// ANIMATION & TRANSITIONS
// ============================================================================
export const Animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};
