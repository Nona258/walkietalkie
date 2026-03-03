import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";

interface SweetAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
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
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  showCancelButton = false,
}: SweetAlertModalProps) {
  const iconMap = {
    success: { name: "checkmark-circle" as const, color: "#237227" },
    error: { name: "close-circle" as const, color: "#ef4444" },
    warning: { name: "warning" as const, color: "#dc2626" },
    info: { name: "information-circle" as const, color: "#237227" },
  };

  const icon = iconMap[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable
        className="items-center justify-center flex-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onCancel}
      >
        <Pressable
          className="items-center p-8 mx-8 bg-white shadow-2xl rounded-3xl"
          style={{ minWidth: 300, maxWidth: 380 }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View
            className="items-center justify-center w-20 h-20 mb-5 rounded-full"
            style={{ backgroundColor: `${icon.color}15` }}
          >
            <Ionicons name={icon.name} size={48} color={icon.color} />
          </View>

          {/* Title */}
          <Text className="text-[#111827] text-xl font-bold text-center mb-3">
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text className="text-[#6b7280] text-base text-center mb-8 leading-6">
              {message}
            </Text>
          ) : (
            <View className="mb-5" />
          )}

          {/* Buttons */}
          <View className="flex-row w-full gap-3">
            {showCancelButton && onCancel && (
              <TouchableOpacity
                className="flex-1 py-3.5 rounded-2xl items-center"
                style={{ backgroundColor: '#237227' }}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#f8fafb' }} className="text-base font-semibold">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-2xl items-center"
              style={{ backgroundColor: '#237227' }}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#f8fafb' }} className="text-base font-bold">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
