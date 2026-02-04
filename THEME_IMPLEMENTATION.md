# Global Theme Implementation Guide

## 🎨 Setup Complete

The application now uses a **global theme system** that pulls the theme color from school preferences and applies it across the dashboard and all routes.

---

## ✅ What Was Implemented

### 1. **Theme Context** (`/contexts/theme-context.tsx`)
   - Centralized theme state management
   - Automatically fetches theme color from `/api/preferences/{schoolId}`
   - Provides `useTheme()` hook for all components
   - Validates hex color format before applying

### 2. **Global Provider** (`/app/_layout.tsx`)
   - Wrapped entire app with `<ThemeProvider>`
   - Theme loads on app startup
   - Available to all screens and components

### 3. **Dashboard** (`/app/dashboard.tsx`)
   - Updated to use `useTheme()` hook
   - Theme color applied to:
     - Section indicators (gold → theme color)
     - Score Entry button (purple → theme color)
     - View Reports button (orange → theme color)
     - Branding utility card highlight
     - Logo placeholder background
   - Utility cards with theme-aware highlighting

### 4. **Preferences Screen** (`/app/preferences.tsx`)
   - Beautiful card-based UI matching dashboard
   - Color picker with 24 preset colors
   - Custom hex input for unlimited colors
   - Live preview
   - Automatically reloads theme across app after saving

---

## 🚀 Using Theme in Components

### Basic Usage

```tsx
import { useTheme } from '@/contexts/theme-context';

export default function MyComponent() {
  const { themeColor, isLoadingTheme } = useTheme();

  return (
    <TouchableOpacity 
      style={{ backgroundColor: themeColor }}
    >
      <Text>Themed Button</Text>
    </TouchableOpacity>
  );
}
```

### Advanced Usage with Gradients

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/theme-context';

export default function GradientHeader() {
  const { themeColor } = useTheme();

  return (
    <LinearGradient 
      colors={[themeColor, themeColor + 'CC']}
      style={{ padding: 20 }}
    >
      <Text style={{ color: '#fff' }}>Header</Text>
    </LinearGradient>
  );
}
```

### With Buttons and Action Cards

```tsx
const { themeColor } = useTheme();

<TouchableOpacity 
  style={[
    styles.actionButton,
    { backgroundColor: themeColor }
  ]}
>
  <Text style={styles.buttonText}>Action</Text>
</TouchableOpacity>
```

---

## 📝 How to Update Other Routes

### Step 1: Import the hook
```tsx
import { useTheme } from '@/contexts/theme-context';
```

### Step 2: Use in component
```tsx
export default function MyScreen() {
  const { themeColor } = useTheme();
  
  // Use themeColor in styles and UI
}
```

### Step 3: Apply to key UI elements
- Primary action buttons
- Section headers
- Accent lines/borders
- Link colors
- Loading indicators
- Important highlights

### Files That Can Use Theme

- ✅ `/app/students_list.tsx` - Primary actions
- ✅ `/app/score-entry.tsx` - Save/Submit buttons  
- ✅ `/app/report-cards.tsx` - Download/View buttons
- ✅ `/app/report-view.tsx` - Header and accents
- ✅ `/app/(tabs)/*` - All tab screens
- ✅ `/components/students-manager.tsx` - Form buttons
- ✅ Any custom components

---

## 🔄 Theme Flow

1. **User sets theme color** in Preferences → Saves to DB
2. **Save triggers** `loadThemeFromPreferences()` → Context updates
3. **All subscribed components** re-render with new color automatically
4. **Next app restart** - theme loads from DB on startup

---

## 🎯 Best Practices

### Do's ✅
- Use theme for primary actions and highlights
- Combine with semi-transparent colors: `themeColor + '20'` (8% opacity)
- Apply to: buttons, headers, borders, indicators, success states
- Load theme early in app lifecycle (already done in `_layout.tsx`)

### Don'ts ❌
- Don't override theme with hardcoded colors for primary actions
- Don't forget to update button styles when theme changes
- Don't apply theme to text on colored backgrounds (use white/dark text instead)

---

## 🧪 Testing the Theme

1. Go to **School Branding** in Dashboard Utilities
2. Select a different color from the palette (e.g., Red #FF5252)
3. Click "Save & Apply Changes"
4. Return to Dashboard → notice all theme elements changed
5. Score Entry button should now be red instead of purple
6. Report Cards button highlights in red instead of orange

---

## 📱 Supported Platforms

- ✅ iOS (mobile)
- ✅ Android (mobile)
- ✅ Web (using localStorage for persistence)

---

## 💾 Database

The theme color is stored in:
- **Table**: `school_preferences`
- **Column**: `theme_color`
- **Format**: Hex string (e.g., `#2196F3`)

---

## 🛠️ Advanced: Custom Color Utilities

```tsx
// Add opacity to color
function withOpacity(color: string, opacity: number): string {
  // E.g., withOpacity('#FF5252', 0.2) → 'rgba(255, 82, 82, 0.2)'
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
```

---

## Questions?

Refer to:
- Theme context: `/contexts/theme-context.tsx`
- Example implementation: `/app/dashboard.tsx`
- Preferences UI: `/app/preferences.tsx`
