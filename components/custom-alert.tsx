import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertStyle,
  Spacing,
  Typography,
  Colors,
  BorderRadius,
  Shadows,
} from '@/constants/design-system';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  showCloseButton?: boolean;
  style?: ViewStyle;
  icon?: boolean;
}

const alertIcons: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

export function CustomAlert({
  type = 'info',
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  showCloseButton = true,
  style,
  icon = true,
}: CustomAlertProps) {
  const alertStyle = AlertStyle[type];

  return (
    <View style={[styles.container, alertStyle.container, style]}>
      <View style={{ flex: 1 }}>
        <View style={styles.contentContainer}>
          {icon && (
            <Ionicons 
              name={alertIcons[type]} 
              size={24} 
              color={alertStyle.text.color} 
              style={styles.icon} 
            />
          )}
          <View style={styles.textContainer}>
            {title && (
              <Text
                style={[
                  styles.title,
                  { color: alertStyle.text.color },
                ]}
              >
                {title}
              </Text>
            )}
            <Text
              style={[
                styles.message,
                { color: alertStyle.text.color },
              ]}
            >
              {message}
            </Text>
          </View>

          {showCloseButton && onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={alertStyle.text.color} />
            </TouchableOpacity>
          )}
        </View>

        {onConfirm && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: alertStyle.text.color + '15' }]}
              onPress={onConfirm}
            >
              <Text style={[styles.confirmButtonText, { color: alertStyle.text.color }]}>
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xl, // Match modern rounded look
    padding: Spacing.lg,
    ...Shadows.md,
    borderLeftWidth: 6, // Thicker left border for premium feel
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800', // Bolder title
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    lineHeight: 20,
    opacity: 0.9,
  },
  closeButton: {
    alignSelf: 'flex-start',
    marginLeft: Spacing.md,
    padding: Spacing.xs,
  },
  actionContainer: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.md,
  },
  confirmButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  confirmButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
  },
});
