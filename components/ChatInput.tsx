import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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

  const handleSubmit = () => {
    if (message.trim() || hasPendingImage) {
      sendMessage();
    }
  };

  const placeholder = hasPendingImage
    ? 'Nhập mô tả cho ảnh...'
    : 'Nhập tin nhắn của bạn...';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.iconButton,
          styles.imageButton,
          hasPendingImage && styles.imageButtonActive,
          loading && styles.disabledButton,
        ]}
        onPress={pickImage}
        disabled={loading}
      >
        <Ionicons
          name={hasPendingImage ? 'image' : 'image-outline'}
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
          placeholderTextColor="#6b7280"
          onSubmitEditing={handleSubmit}
          multiline
          editable={!loading}
          returnKeyType="send"
        />
      </View>

      <TouchableOpacity
        style={[styles.iconButton, styles.sendButton, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Ionicons name="send" size={20} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 48,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButton: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#EEF2FF',
  },
  imageButtonActive: {
    backgroundColor: '#2563eb',
  },
  sendButton: {
    backgroundColor: '#2563eb',
  },
  clearButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButton: {
    opacity: 0.5,
  },
});