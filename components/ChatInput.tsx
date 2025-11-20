import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  sendMessage: () => void;
  pickImage: () => void;
  pickCamera: () => void;
  startVoice: () => void; // Thêm prop cho start voice
  stopVoice: () => void; // Thêm prop cho stop voice
  seconds: number;
  isRecording: boolean; // Thêm state recording
  loading: boolean;
  hasPendingImage: boolean;
}

export default function ChatInput({
  message,
  setMessage,
  sendMessage,
  pickImage,
  pickCamera,
  startVoice,
  stopVoice,
  seconds,
  isRecording,
  loading,
  hasPendingImage,
}: ChatInputProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  // Speech to text timer
  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleSubmit = () => {
    if ((message.trim() || hasPendingImage) && !loading) {
      sendMessage();
    }
  };

  const placeholder = hasPendingImage
    ? 'Nhập mô tả cho ảnh...'
    : 'Nhập tin nhắn của bạn...';

  return (
    <View style={styles.container}>
      {/* Mic Button - Thêm mới */}
      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.micButton,
          isRecording && styles.micButtonActive,
          loading && styles.disabledButton,
        ]}
        onPress={isRecording ? stopVoice : startVoice}
        disabled={loading}
      >
        <Ionicons
          name={isRecording ? "mic" : "mic-outline"}
          size={22}
          color={isRecording ? "#ffffff" : "#2563eb"}
        />
      </TouchableOpacity>

      {isRecording && (
        <View style={styles.timerContainer}>
          <ThemedText style={styles.timerText}>{formatTime(seconds)}</ThemedText>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.imageButton,
          hasPendingImage && { backgroundColor: tintColor, borderColor: tintColor },
          loading && styles.disabledButton,
        ]}
        onPress={pickImage}
        disabled={loading || isRecording}
      >
        <Ionicons
          name={hasPendingImage ? 'image' : 'image-outline'}
          size={22}
          color={hasPendingImage ? '#ffffff' : tintColor}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.imageButton,
          hasPendingImage && styles.imageButtonActive,
          loading && styles.disabledButton,
        ]}
        onPress={pickCamera}
        disabled={loading}
      >
        <Ionicons
          name={hasPendingImage ? 'camera' : 'camera-outline'}
          size={22}
          color={hasPendingImage ? '#ffffff' : '#2563eb'}
        />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          onSubmitEditing={handleSubmit}
          multiline
          editable={!loading}
          returnKeyType="send"
          blurOnSubmit={false} // Giữ bàn phím khi gửi (tùy chọn)
        />
      </View>

      {/* Nút gửi */}
      <TouchableOpacity
        style={[
          styles.iconButton,
          { backgroundColor: tintColor },
          (!message.trim() && !hasPendingImage) && styles.disabledButton,
        ]}
        onPress={handleSubmit}
        disabled={loading || (!message.trim() && !hasPendingImage)}
      >
        {loading ? (
            <ActivityIndicator size="small" color="#fff" />
        ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Căn đáy để đẹp hơn khi input nhiều dòng
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 8,
    backgroundColor: 'transparent', // Để KeyboardAvoidingView xử lý nền
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 8, // Tăng padding dọc
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingTop: 0, // Fix lỗi padding textinput trên Android
    paddingBottom: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22, // Hình tròn
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  imageButtonActive: {
    // Style này sẽ được override bởi logic trong component
  },
  disabledButton: {
    opacity: 0.5,
  },
  micButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#EEF2FF',
  },
  micButtonActive: {
    backgroundColor: '#ef4444', // Màu đỏ khi active (từ mock)
    borderColor: '#ef4444',
  },
  // Thêm styles cho timer vào StyleSheet.create của ChatInput (cuối styles)
  timerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50, // Để có chỗ cho text
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444', // Màu đỏ như active
  },
});