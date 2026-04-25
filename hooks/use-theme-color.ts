/**
 * Hook to resolve a theme color token against the current effective color scheme.
 * Reads from ThemeContext (not RN's useColorScheme) so it reacts to manual
 * light / dark / system selection made in the Preferences screen.
 */

import { Colors } from '@/constants/theme';
import { useEffectiveColorScheme } from '@/contexts/theme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const scheme = useEffectiveColorScheme() ?? 'dark';
  const colorFromProps = props[scheme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[scheme][colorName] as string;
}
