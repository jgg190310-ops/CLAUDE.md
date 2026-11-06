import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

/** true no iPhone com iOS 26 ou mais novo: usa o Liquid Glass nativo da Apple. */
export const NATIVE_GLASS =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

type Props = {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** 'regular' para painéis, 'clear' para controles sobre fotos. */
  variant?: 'regular' | 'clear';
  tint?: string;
  interactive?: boolean;
};

/**
 * Vidro: `GlassView` do expo-glass-effect quando o aparelho tem Liquid Glass;
 * nos outros aparelhos, um desfoque do expo-blur com borda clara, para manter o mesmo desenho.
 */
export function Glass({ style, children, variant = 'regular', tint, interactive }: Props) {
  if (NATIVE_GLASS) {
    return (
      <GlassView style={style} glassEffectStyle={variant} tintColor={tint} isInteractive={interactive} colorScheme="dark">
        {children}
      </GlassView>
    );
  }
  const flat = StyleSheet.flatten(style) || {};
  return (
    <View style={[style, styles.fallbackShell, { borderRadius: flat.borderRadius }]}>
      <BlurView intensity={variant === 'clear' ? 30 : 55} tint="dark" style={[StyleSheet.absoluteFill, { borderRadius: flat.borderRadius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fallbackTint, { borderRadius: flat.borderRadius }, tint ? { backgroundColor: tint } : null]} />
      {children}
    </View>
  );
}

/** Grupo de vidros que se fundem quando estão próximos (só no Liquid Glass nativo). */
export function GlassGroup({ spacing = 10, style, children }: { spacing?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  if (NATIVE_GLASS) return <GlassContainer spacing={spacing} style={style}>{children}</GlassContainer>;
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  fallbackShell: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fallbackTint: { backgroundColor: 'rgba(24,20,16,0.28)' },
});
