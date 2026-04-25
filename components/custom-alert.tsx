import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
  Dimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertStyle,
  Spacing,
  Typography,
  Colors,
  BorderRadius,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const alertIcons: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

const alertColors: Record<AlertType, string> = {
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export function CustomAlert({
  type = 'info',
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = 'OK',
  showCloseButton = true,
  style,
  icon = true,
}: CustomAlertProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 150,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Handle back button on Android
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose?.();
        return true;
      });
      return () => backHandler.remove();
    }
  }, []);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const handleConfirm = () => {
    onConfirm?.();
    handleClose();
  };

  const alertColor = alertColors[type];

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Animated.View 
        style={[
          styles.backdrop, 
          { opacity: backdropAnim }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Alert Container - Bottom Sheet Style */}
      <Animated.View 
        style={[
          styles.container,
          { 
            transform: [{ translateY: slideAnim }],
            paddingBottom: Math.max(insets.bottom, Spacing.lg),
          },
          style,
        ]}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${alertColor}20` }]}>
              <Ionicons 
                name={alertIcons[type]} 
                size={32} 
                color={alertColor} 
              />
            </View>
          )}

          {/* Text Content */}
          <View style={styles.textContainer}>
            {title && (
              <Text style={styles.title}>{title}</Text>
            )}
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Close Button */}
          {showCloseButton && onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {onConfirm ? (
            <>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: alertColor }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.singleButton, { backgroundColor: alertColor }]}
              onPress={handleClose}
            >
              <Text style={styles.singleButtonText}>
                {confirmLabel || 'OK'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  dragHandleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: Typography.fontSize.md,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  closeButton: {
    padding: Spacing.xs,
    marginTop: -Spacing.xs,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
  singleButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
  },
});
