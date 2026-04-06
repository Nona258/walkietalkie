import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import '../global.css';

interface SweetAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export default function SweetAlertModal({
  visible,
  title,
  message,
  type,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancelButton = false,
}: SweetAlertModalProps) {
  const palette = {
    green: '#237227',
    cloudmist: '#f8fafb',
  };

  const iconMap = {
    success: { name: 'checkmark-circle' as const, color: '#10b981' },
    error: { name: 'close-circle' as const, color: '#ef4444' },
    warning: { name: 'warning' as const, color: '#ef4444' },
    info: { name: 'information-circle' as const, color: '#3b82f6' },
  };

  const icon = iconMap[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable
        className="items-center justify-center flex-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onPress={onCancel}>
        <Pressable
          className="items-center p-8 mx-8 bg-white shadow-2xl rounded-3xl"
          style={{ minWidth: 300, maxWidth: 380 }}
          onPress={(e) => e.stopPropagation()}>
          {/* Icon */}
          <View
            className="items-center justify-center w-20 h-20 mb-5 rounded-full"
            style={{ backgroundColor: icon.color }}>
            <Ionicons name={icon.name} size={48} color={palette.cloudmist} />
          </View>

          {/* Title */}
          <Text className="mb-3 text-center text-xl font-bold text-[#111827]">{title}</Text>

          {/* Message */}
          {message ? (
            <Text className="mb-8 text-center text-base leading-6 text-[#6b7280]">{message}</Text>
          ) : (
            <View className="mb-5" />
          )}

          {/* Buttons */}
          <View className="flex-row w-full gap-3">
            {showCancelButton && onCancel && (
              <TouchableOpacity
                className="flex-1 items-center rounded-2xl border py-3.5"
                style={{ borderColor: palette.green }}
                onPress={onCancel}
                activeOpacity={0.8}>
                <Text className="text-base font-semibold text-stone-900">{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 items-center rounded-2xl py-3.5"
              style={{ backgroundColor: palette.green }}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text className="text-base font-bold" style={{ color: palette.cloudmist }}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
