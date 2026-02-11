import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native';

type ToastType = 'success' | 'error' | 'info';
let trigger: ((opts: { type?: ToastType; text1: string; text2?: string }) => void) | null = null;

export function showToast(opts: { type?: ToastType; text1: string; text2?: string }) {
  if (trigger) trigger(opts);
}

export default function SimpleToast() {
  const [message, setMessage] = useState<{ type?: ToastType; text1: string; text2?: string } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    trigger = (opts) => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current as unknown as number);
        hideTimer.current = null;
      }
      setMessage(opts);
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      hideTimer.current = (setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setMessage(null));
      }, 3000) as unknown) as number;
    };
    return () => { trigger = null; };
  }, [anim]);

  if (!message) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  const screenW = Dimensions.get('window').width;

  const background = message.type === 'error' ? '#fee2e2' : message.type === 'success' ? '#ecfdf5' : '#eef2ff';
  const border = message.type === 'error' ? '#fecaca' : message.type === 'success' ? '#bbf7d0' : '#c7d2fe';
  const textColor = '#0f172a';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], width: Math.min(520, screenW - 40) }]} pointerEvents="box-none">
      <View style={[styles.toast, { backgroundColor: background, borderColor: border }]}> 
        <Text style={[styles.title, { color: textColor }]}>{message.text1}</Text>
        {message.text2 ? <Text style={[styles.subtitle, { color: textColor }]}>{message.text2}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 4 },
});
