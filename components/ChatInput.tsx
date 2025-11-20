// components/ChatInput.tsx
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

interface ChatInputProps {
  message: string;
  setMessage: (t: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onPickCamera: () => void;
  audio: {
    isRecording: boolean;
    seconds: number;
    start: () => void;
    stop: () => void;
  };
  loading: boolean;
  hasPendingImage: boolean;
}

export default function ChatInput({
  message, setMessage, onSend, onPickImage, onPickCamera, audio, loading, hasPendingImage
}: ChatInputProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  const handleSend = () => {
    if ((message.trim() || hasPendingImage) && !loading) onSend();
  };

  return (
    <View style={styles.container}>
      {/* Mic Button */}
      <TouchableOpacity
        style={[styles.iconButton, styles.micButton, audio.isRecording && styles.micButtonActive, loading && styles.disabled]}
        onPress={audio.isRecording ? audio.stop : audio.start}
        disabled={loading}
      >
        {audio.isRecording ? (
          <ThemedText style={styles.micTimerText}>{formatTime(audio.seconds)}</ThemedText>
        ) : (
          <Ionicons name="mic-outline" size={22} color="#2563eb" />
        )}
      </TouchableOpacity>

      {/* Image/Camera Buttons */}
      <TouchableOpacity
        style={[styles.iconButton, styles.imageButton, hasPendingImage && { backgroundColor: tintColor, borderColor: tintColor }]}
        onPress={onPickImage} disabled={loading || audio.isRecording}
      >
        <Ionicons name={hasPendingImage ? 'image' : 'image-outline'} size={22} color={hasPendingImage ? '#fff' : '#2563eb'} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={onPickCamera} disabled={loading}>
        <Ionicons name="camera-outline" size={22} color="#2563eb" />
      </TouchableOpacity>

      {/* Input Field */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          value={message}
          onChangeText={setMessage}
          placeholder={hasPendingImage ? "Mô tả ảnh..." : "Nhập tin nhắn..."}
          placeholderTextColor="#9ca3af"
          onSubmitEditing={handleSend}
          multiline
          editable={!loading}
        />
      </View>

      {/* Send Button */}
      <TouchableOpacity
        style={[styles.iconButton, { backgroundColor: tintColor }, (!message.trim() && !hasPendingImage) && styles.disabled]}
        onPress={handleSend}
        disabled={loading || (!message.trim() && !hasPendingImage)}
      >
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#E5E5E5', gap: 8 },
  inputWrapper: { flex: 1, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, maxHeight: 120, justifyContent: 'center' },
  input: { flex: 1, fontSize: 16, paddingTop: 0, paddingBottom: 0 },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  micButton: {},
  micButtonActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  imageButton: {},
  micTimerText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  disabled: { opacity: 0.5 },
});