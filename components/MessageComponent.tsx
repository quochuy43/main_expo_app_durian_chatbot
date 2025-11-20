import React, { memo } from 'react';
import { Image, StyleSheet, View, Linking, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import MarkdownDisplay from 'react-native-markdown-display';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

// --- Types ---
type Sender = 'user' | 'bot' | 'error';

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  image?: string;
  isPending?: boolean;
}

interface MessageProps {
  message: ChatMessage;
}

// --- Component con: Xử lý hiển thị Markdown ---
const MarkdownRenderer = memo(({ content }: { content: string }) => {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const borderColor = useThemeColor({}, 'border');
  
  // Logic màu sắc cho Code Block (Light/Dark)
  const isDark = textColor === '#ECEDEE' || textColor === '#fff';
  const codeBg = isDark ? '#252525' : '#F3F4F6';
  const codeColor = isDark ? '#E0E0E0' : '#24292e';

  // SỬA LỖI: Bỏ ": MarkdownStyle" để TypeScript tự suy luận, hoặc dùng StyleSheet.create
  // Tuy nhiên với thư viện này, truyền object thường linh hoạt hơn StyleSheet.create
  const markdownStyles = {
    // Text cơ bản
    body: {
      color: textColor,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    // Đoạn văn
    paragraph: {
      marginTop: 0,
      marginBottom: 10,
    },
    // Heading (Tiêu đề)
    heading1: {
      fontSize: 22,
      fontWeight: '700' as const, // Ép kiểu cho fontWeight
      marginTop: 16,
      marginBottom: 8,
      color: textColor,
    },
    heading2: {
      fontSize: 20,
      fontWeight: '600' as const,
      marginTop: 14,
      marginBottom: 8,
      color: textColor,
    },
    // Code Block (```code```)
    fence: {
      backgroundColor: codeBg,
      color: codeColor,
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
    },
    // Inline Code (`code`)
    code_inline: {
      backgroundColor: codeBg,
      color: tintColor,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: borderColor,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      fontWeight: '500' as const,
    },
    // Link
    link: {
      color: tintColor,
      textDecorationLine: 'none' as const,
      fontWeight: '600' as const,
    },
    // List (Danh sách)
    list_item: {
      marginVertical: 4,
    },
    bullet_list: {
      marginBottom: 8,
    },
    // Table (Bảng)
    table: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 8,
      overflow: 'hidden' as const,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: borderColor,
      flexDirection: 'row' as const,
    },
    th: {
      padding: 10,
      backgroundColor: isDark ? '#333' : '#E5E7EB',
      fontWeight: 'bold' as const,
      color: textColor,
      flex: 1,
    },
    td: {
      padding: 10,
      color: textColor,
      flex: 1,
    },
    // Blockquote (Trích dẫn)
    blockquote: {
      backgroundColor: 'transparent',
      borderLeftWidth: 4,
      borderLeftColor: tintColor,
      paddingLeft: 16,
      marginTop: 8,
      marginBottom: 8,
      opacity: 0.8,
    },
  };

  return (
    <MarkdownDisplay
      style={markdownStyles}
      onLinkPress={(url) => {
        Linking.openURL(url).catch(console.error);
        return true;
      }}
    >
      {content}
    </MarkdownDisplay>
  );
});

// --- Component chính ---
export default function MessageComponent({ message }: MessageProps) {
  const { sender, text, image, isPending } = message;

  const isUser = sender === 'user';
  const isBot = sender === 'bot';
  const isError = sender === 'error';

  // Màu sắc động từ theme
  const userBg = useThemeColor({}, 'tint'); 
  const botBg = useThemeColor({ light: '#ffffff', dark: '#1E1E1E' }, 'background'); 
  const errorBg = useThemeColor({ light: '#FEE2E2', dark: '#450a0a' }, 'background');
  
  // Container style
  const containerStyles = [
    styles.messageContainer,
    isUser ? { backgroundColor: userBg } : undefined,
    isBot ? { 
      backgroundColor: botBg, 
      borderWidth: 0.5, 
      borderColor: useThemeColor({}, 'border') 
    } : undefined,
    isError ? { backgroundColor: errorBg } : undefined,
    isUser && { alignSelf: 'flex-end' },
    isError && { alignSelf: 'flex-start' },
    isPending && styles.pendingMessage,
  ];

  const renderContent = () => {
    // 1. Render Ảnh
    if (image) {
      return (
        <View>
          {text ? (
            <ThemedText
              style={[
                styles.messageText,
                isUser ? styles.userText : undefined,
              ]}
            >
              {text}
            </ThemedText>
          ) : null}
          <Image source={{ uri: image }} style={styles.messageImage} />
          {isPending && (
            <ThemedText style={styles.pendingText}>
              📝 Preview - Nhấn gửi để xác nhận
            </ThemedText>
          )}
        </View>
      );
    }

    // 2. Render Bot (Markdown)
    if (isBot) {
      return (
        <View style={styles.markdownWrapper}>
          <View style={styles.botHeader}>
             <Ionicons name="sparkles" size={16} color={useThemeColor({}, 'tint')} style={{marginRight: 6}} />
             <ThemedText style={{fontSize: 12, opacity: 0.7, fontWeight: '600'}}>AI Assistant</ThemedText>
          </View>
          <MarkdownRenderer content={text} />
        </View>
      );
    }

    // 3. Render Lỗi
    if (isError) {
      return (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" style={{marginRight: 8}} />
            <ThemedText style={styles.errorText}>{text}</ThemedText>
        </View>
      );
    }

    // 4. Render User
    return (
      <ThemedText style={[styles.messageText, styles.userText]}>
        {text}
      </ThemedText>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(300)} style={containerStyles}>
      {renderContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '88%', 
    padding: 14,
    borderRadius: 18,
    marginVertical: 6,
    marginHorizontal: 12,
    alignSelf: 'flex-start',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  markdownWrapper: {
    width: '100%',
  },
  botHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  pendingMessage: {
    opacity: 0.8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#ffffff', 
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  messageImage: {
    borderRadius: 12,
    width: 240,
    height: 180,
    resizeMode: 'cover',
    marginTop: 8,
  },
  pendingText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});