import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Message } from '@/types/chat';
import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import Animated, { FadeInUp } from 'react-native-reanimated';

// --- Styles cho Markdown (Có thể tách file riêng nếu muốn) ---
const getMarkdownStyles = (textColor: string, tintColor: string, borderColor: string) => ({
  body: { color: textColor, fontSize: 16, lineHeight: 24 },
  code_inline: { backgroundColor: '#F3F4F6', color: tintColor, borderRadius: 4, borderWidth: 1, borderColor },
  fence: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor, padding: 12, borderRadius: 8 },
});

// --- Sub-components ---
const BotHeader = ({ tintColor }: { tintColor: string }) => (
  <View style={styles.botHeader}>
    <Ionicons name="sparkles" size={16} color={tintColor} style={{ marginRight: 6 }} />
    <ThemedText style={styles.botName}>Durian Consultant</ThemedText>
  </View>
);

const ImageMessage = ({ uri, isPending, text }: { uri: string, isPending?: boolean, text: string }) => (
  <View>
    {!!text && <ThemedText style={[styles.messageText, { color: '#fff' }]}>{text}</ThemedText>}
    <Image source={{ uri }} style={styles.messageImage} />
    {isPending && <ThemedText style={styles.pendingText}>📝 Preview - Nhấn gửi để xác nhận</ThemedText>}
  </View>
);

// --- Main Component ---
export default memo(function MessageComponent({ message }: { message: Message }) {
  const { sender, text, image, isPending } = message;
  const tintColor = useThemeColor({}, 'tint');
  const userBg = useThemeColor({}, 'tint');
  const botBg = useThemeColor({ light: '#ffffff', dark: '#1E1E1E' }, 'background');
  const errorBg = useThemeColor({ light: '#FEE2E2', dark: '#450a0a' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const containerStyle = [
    styles.container,
    sender === 'user' ? { backgroundColor: userBg, alignSelf: 'flex-end' } : undefined,
    sender === 'bot' ? { backgroundColor: botBg, borderWidth: 0.5, borderColor } : undefined,
    sender === 'error' ? { backgroundColor: errorBg } : undefined,
    isPending && styles.pending,
  ] as any;

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={containerStyle}>
      {image ? (
        <ImageMessage uri={image} isPending={isPending} text={text} />
      ) : sender === 'bot' ? (
        <View style={{ width: '100%' }}>
          <BotHeader tintColor={tintColor} />
          <MarkdownDisplay style={getMarkdownStyles(textColor, tintColor, borderColor)} onLinkPress={(url) => { Linking.openURL(url); return true; }}>
            {text}
          </MarkdownDisplay>
        </View>
      ) : sender === 'error' ? (
        <View style={{ flexDirection: 'row' }}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <ThemedText style={{ color: '#DC2626', fontWeight: '600' }}>{text}</ThemedText>
        </View>
      ) : (
        <ThemedText style={[styles.messageText, { color: '#fff' }]}>{text}</ThemedText>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { maxWidth: '88%', padding: 14, borderRadius: 18, marginVertical: 6, marginHorizontal: 12, alignSelf: 'flex-start', shadowOpacity: 0.05, elevation: 1 },
  pending: { opacity: 0.8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#93c5fd' },
  botHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  botName: { fontSize: 12, opacity: 0.7, fontWeight: '600' },
  messageText: { fontSize: 16, lineHeight: 24 },
  messageImage: { borderRadius: 12, width: 240, height: 180, resizeMode: 'cover', marginTop: 8 },
  pendingText: { marginTop: 6, fontSize: 12, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' },
});