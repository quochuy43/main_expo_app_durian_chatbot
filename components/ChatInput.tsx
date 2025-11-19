import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  sendMessage: () => void;
  pickImage: () => void;
  loading: boolean;
  hasPendingImage: boolean;
}

export default function ChatInput({
  message,
  setMessage,
  sendMessage,
  pickImage,
  loading,
  hasPendingImage,
}: ChatInputProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

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
      {/* Nút chọn ảnh */}
      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.imageButton,
          hasPendingImage && { backgroundColor: tintColor, borderColor: tintColor },
          loading && styles.disabledButton,
        ]}
        onPress={pickImage}
        disabled={loading}
      >
        <Ionicons
          name={hasPendingImage ? 'image' : 'image-outline'}
          size={22}
          color={hasPendingImage ? '#ffffff' : tintColor}
        />
      </TouchableOpacity>

      {/* Ô nhập liệu */}
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
});