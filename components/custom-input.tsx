import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import {
  InputStyle,
  Colors,
  Typography,
  Spacing,
  BorderRadius,
} from '@/constants/design-system';

interface CustomInputProps extends TextInputProps {
  label?: string;
  placeholder?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: any;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export function CustomInput({
  label,
  placeholder,
  error,
  isPassword = false,
  containerStyle,
  inputStyle,
  icon,
  rightIcon,
  helperText,
  value,
  onChangeText,
  ...props
}: CustomInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = isPassword && !showPassword;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            { color: error ? Colors.error : Colors.text.primary },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          InputStyle.container,
          isFocused && InputStyle.focused,
          error && InputStyle.error,
          styles.inputContainer,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <TextInput
          style={[
            styles.input,
            { color: Colors.text.primary },
            icon ? { marginLeft: Spacing.sm } : undefined,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={InputStyle.placeholder}
          secureTextEntry={isSecure}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            style={styles.iconRight}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.iconText}>
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </Text>
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.iconRight}>{rightIcon}</View>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
      {helperText && !error && (
        <Text style={styles.helperText}>{helperText}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: '400',
    paddingVertical: Spacing.md,
  },
  iconLeft: {
    marginRight: Spacing.md,
  },
  iconRight: {
    marginLeft: Spacing.md,
    padding: Spacing.sm,
  },
  iconText: {
    fontSize: 18,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.sm,
    fontWeight: '500',
  },
  helperText: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.sm,
  },
});
