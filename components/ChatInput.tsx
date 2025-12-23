import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, TouchableOpacity, View, Text } from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';
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
  tourStep?: number;
  onNextTourStep?: () => void;
  onPrevTourStep?: () => void;
  onEndTour?: () => void;
}

export default function ChatInput({
  message, setMessage, onSend, onPickImage, onPickCamera, audio, loading, hasPendingImage,
  tourStep = 0, onNextTourStep, onPrevTourStep, onEndTour
}: ChatInputProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  const formatTime = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  const handleSend = () => {
    if ((message.trim() || hasPendingImage) && !loading) onSend();
  };

  // Helper for Tooltip Content
  const renderTooltipContent = (step: string, text: string, isLastStep = false) => (
    <View style={styles.tooltipContent}>
      <Text style={styles.tourStepIndicator}>{step}</Text>
      <Text style={styles.tooltipText}>{text}</Text>
      <View style={styles.tourNavButtons}>
        {onPrevTourStep && (
          <TouchableOpacity style={styles.tourPrevButton} onPress={onPrevTourStep}>
            <Text style={styles.tourPrevButtonText}>← Quay lại</Text>
          </TouchableOpacity>
        )}
        {onEndTour && (
          <TouchableOpacity style={styles.tourEndButton} onPress={onEndTour}>
            <Text style={styles.tourEndButtonText}>Kết thúc</Text>
          </TouchableOpacity>
        )}
        {onNextTourStep && (
          <TouchableOpacity style={styles.tooltipButton} onPress={onNextTourStep}>
            <Text style={styles.tooltipButtonText}>{isLastStep ? "Hoàn thành" : "Tiếp theo →"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* Mic Button - Step 8 */}
      <Tooltip
        isVisible={tourStep === 8}
        content={renderTooltipContent('Bước 8/10', '🎤 Nhấn vào để nói chuyện trực tiếp với chuyên gia sầu riêng thay vì gõ phím.')}
        placement="top"
        onClose={() => { }}
        backgroundColor="rgba(0,0,0,0.7)"
        contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
      >
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
      </Tooltip>

      {/* Image/Camera Buttons - Step 9 */}
      <Tooltip
        isVisible={tourStep === 9}
        content={renderTooltipContent('Bước 9/10', '📷 Chụp hoặc gửi ảnh lá/quả sầu riêng để AI chẩn đoán bệnh chính xác.')}
        placement="top"
        onClose={() => { }}
        backgroundColor="rgba(0,0,0,0.7)"
        contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
      >
        <View style={styles.imageButtonGroup}>
          <TouchableOpacity
            style={[styles.iconButton, styles.imageButton, hasPendingImage && { backgroundColor: tintColor, borderColor: tintColor }]}
            onPress={onPickImage} disabled={loading || audio.isRecording}
          >
            <Ionicons name={hasPendingImage ? 'image' : 'image-outline'} size={22} color={hasPendingImage ? '#fff' : '#2563eb'} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={onPickCamera} disabled={loading}>
            <Ionicons name="camera-outline" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </Tooltip>

      {/* Input Field & Send - Step 10 */}
      <View style={[styles.inputContainer, { flex: 1, flexDirection: 'row', gap: 8 }]}>
        {/* Input Wrapper */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              { color: textColor },
              Platform.OS === 'ios' && { paddingTop: 12, paddingBottom: 12 }
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={hasPendingImage ? "Mô tả ảnh..." : "Nhập tin nhắn..."}
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleSend}
            multiline={true}
            editable={!loading}
          />
        </View>

        <Tooltip
          isVisible={tourStep === 10}
          content={renderTooltipContent('Bước 10/10', '➤ Nhập câu hỏi và nhấn Gửi để nhận tư vấn ngay lập tức.', true)}
          placement="top"
          onClose={() => { }}
          backgroundColor="rgba(0,0,0,0.7)"
          contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
        >
          {/* Send Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: tintColor }, (!message.trim() && !hasPendingImage) && styles.disabled]}
            onPress={handleSend}
            disabled={loading || (!message.trim() && !hasPendingImage)}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </Tooltip>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 8
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    width: '100%',
    flex: 1,
    paddingVertical: 8,
  },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  micButton: {},
  micButtonActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  imageButton: {},
  imageButtonGroup: { flexDirection: 'row', gap: 8 },
  micTimerText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  disabled: { opacity: 0.5 },
  // Tour Guide Styles
  tooltipContent: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
  },
  tooltipText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  tooltipButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tooltipButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tourStepIndicator: {
    color: '#1a8f4a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  tourNavButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tourPrevButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourPrevButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  tourEndButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourEndButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});