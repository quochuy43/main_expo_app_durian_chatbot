import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import MarkdownDisplay from 'react-native-markdown-display';

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

export default function MessageComponent({ message }: MessageProps) {
  const { sender, text, image, isPending } = message;

  const isUser = sender === 'user';
  const isBot = sender === 'bot';
  const isError = sender === 'error';

  const containerStyles = [
    styles.messageContainer,
    isUser ? styles.userMessage : isBot ? styles.botMessage : styles.errorMessage,
    isUser && { alignSelf: 'flex-end' },
    isError && { alignSelf: 'flex-start' },
    isPending && styles.pendingMessage,
  ];

  const renderContent = () => {
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

    if (isBot) {
      return (
        <View>
          <MarkdownDisplay style={markdownStyles}>{text}</MarkdownDisplay>
        </View>
      );
    }

    if (isError) {
      return (
        <ThemedText style={styles.errorText}>
          {text}
        </ThemedText>
      );
    }

    return (
      <View>
        <ThemedText style={[styles.messageText, styles.userText]}>
          {text}
        </ThemedText>
      </View>
    );
  };

  return (
    <Animated.View entering={FadeInUp.duration(250)} style={containerStyles}>
      {renderContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    marginHorizontal: 8,
    alignSelf: 'flex-start',
  },
  userMessage: {
    backgroundColor: '#3b82f6',
  },
  botMessage: {
    backgroundColor: '#f3f4f6',
  },
  errorMessage: {
    backgroundColor: '#fecaca',
  },
  pendingMessage: {
    opacity: 0.7,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#93c5fd',
  },
  senderLabel: {
    fontWeight: '600',
    marginBottom: 4,
    color: '#374151',
  },
  senderLabelUser: {
    color: '#ffffff',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1f2937',
  },
  userText: {
    color: '#ffffff',
  },
  errorText: {
    color: '#991b1b',
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
  },
});

const markdownStyles = {
  body: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 20,
  },
  paragraph: {
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
};