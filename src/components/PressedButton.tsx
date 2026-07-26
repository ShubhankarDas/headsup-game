import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fonts, radii } from '../theme/theme';

interface PressedButtonProps extends PropsWithChildren {
  onPress: () => void;
  variant?: 'primary' | 'grape' | 'secondary';
  style?: ViewStyle;
  disabled?: boolean;
}

const SHADOW_OFFSET = 6;

const VARIANT_STYLES = {
  primary: { bg: colors.sun, text: colors.ink, shadow: colors.sunDark, border: colors.ink },
  grape: { bg: colors.grape, text: colors.cloud, shadow: colors.grapeDark, border: colors.ink },
  secondary: { bg: 'transparent', text: colors.cloud, shadow: 'transparent', border: colors.cardBorder },
} as const;

export function PressedButton({ onPress, variant = 'primary', style, disabled, children }: PressedButtonProps) {
  const v = VARIANT_STYLES[variant];
  const [pressed, setPressed] = useState(false);
  const hasShadow = v.shadow !== 'transparent';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      style={[
        styles.wrapper,
        { paddingBottom: hasShadow ? SHADOW_OFFSET : 0 },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {hasShadow ? (
        <View
          style={[
            styles.shadowLayer,
            { backgroundColor: v.shadow, borderRadius: radii.lg, bottom: 0 },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.face,
          {
            backgroundColor: v.bg,
            borderColor: v.border,
            borderWidth: variant === 'secondary' ? 2 : 3,
            transform: pressed && hasShadow ? [{ translateY: SHADOW_OFFSET }] : [{ translateY: 0 }],
          },
        ]}
      >
        <Text style={[styles.label, { color: v.text }]}>{children}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SHADOW_OFFSET,
  },
  face: {
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
