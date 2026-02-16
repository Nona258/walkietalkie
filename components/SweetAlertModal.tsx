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
    success: { name: "checkmark-circle" as const, color: "#10b981" },
    error: { name: "close-circle" as const, color: "#ef4444" },
    warning: { name: "warning" as const, color: "#f59e0b" },
    info: { name: "information-circle" as const, color: "#3b82f6" },
  };

  const icon = iconMap[type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onCancel}
      >
        <Pressable
          className="bg-white rounded-3xl p-8 mx-8 items-center shadow-2xl"
          style={{ minWidth: 300, maxWidth: 380 }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-5"
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
                className="flex-1 py-3.5 rounded-2xl items-center border border-gray-200"
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text className="text-[#6b7280] text-base font-semibold">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 py-3.5 rounded-2xl items-center"
              style={{ backgroundColor: icon.color }}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-bold">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}