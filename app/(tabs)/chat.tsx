import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ImageStyle,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';

const { width: screenWidth } = Dimensions.get('window');
const maxWidth = screenWidth * 0.8;

interface Message {
    id: string;
    sender: 'user' | 'bot' | 'error';
    text: string;
    image?: string;
    isPending?: boolean;
}

// Hàm tạo unique ID
let messageIdCounter = 0;
const generateUniqueId = () => {
    return `${Date.now()}-${messageIdCounter++}`;
};

export default function ChatbotScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: generateUniqueId(),
            sender: 'bot',
            text: 'Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingImage, setPendingImage] = useState<{ uri: string; file: any } | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const botTextRef = useRef(''); // Perf: Accumulate text mà không re-render thừa
    const sendDebounceRef = useRef<number | null>(null); // Fix: number cho RN setTimeout

    useEffect(() => {
        return () => {
            if (sendDebounceRef.current !== null) {
                clearTimeout(sendDebounceRef.current);
            }
        };
    }, []);

    const scrollToBottom = () => {
        scrollRef.current?.scrollToEnd({ animated: true });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageUpload = async () => {
        if (isStreaming || loading) return;
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần quyền truy cập gallery để chọn ảnh.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const imageUri = asset.uri;
            const file = {
                uri: imageUri,
                name: asset.fileName || 'image.jpg',
                type: 'image/jpeg',
            };
            setPendingImage({ uri: imageUri, file });

            const previewMsg: Message = {
                id: generateUniqueId(),
                sender: 'user',
                text: input.trim(),
                image: imageUri,
                isPending: true,
            };
            setMessages((prev) => [...prev, previewMsg]);
        }
    };

    const sendMessage = async (messageText?: string) => {
        // Debounce 500ms để tránh lặp press/enter
        if (sendDebounceRef.current !== null) {
            clearTimeout(sendDebounceRef.current);
        }
        sendDebounceRef.current = setTimeout(async () => { // Fix: setTimeout trả number
            if (isStreaming || loading) {
                console.log('⏹️ Skip duplicate sendMessage');
                return;
            }

            const message = messageText || input.trim();
            const hasFile = pendingImage?.file;
            if (!message && !hasFile) return;

            const finalMessage = message || (hasFile ? 'Hãy giới thiệu về' : '');
            let updatedMessages = [...messages];

            if (hasFile) {
                updatedMessages = updatedMessages.map((msg) =>
                    msg.isPending ? { ...msg, isPending: false, text: finalMessage } : msg
                );
            } else {
                updatedMessages.push({
                    id: generateUniqueId(),
                    sender: 'user',
                    text: finalMessage,
                });
            }

            setMessages(updatedMessages);
            setInput('');
            setPendingImage(null);
            setLoading(true);
            setIsStreaming(true);

            const botMsgId = generateUniqueId();
            const botMsg: Message = {
                id: botMsgId,
                sender: 'bot',
                text: '',
                isPending: true,
            };
            updatedMessages.push(botMsg);
            setMessages(updatedMessages);
            scrollToBottom();

            botTextRef.current = ''; // Reset accum text
            let chunkReceived = false;
            let timeoutId: number | null = null;

            const endStream = (error?: any) => {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                setLoading(false);
                setIsStreaming(false);
                // Update final bot text từ ref
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === botMsgId ? { ...msg, text: botTextRef.current, isPending: false } : msg
                    )
                );
                if (error) {
                    const withoutBot = updatedMessages.filter((m) => m.id !== botMsgId);
                    setMessages([
                        ...withoutBot,
                        {
                            id: generateUniqueId(),
                            sender: 'error',
                            text: '❌ Lỗi kết nối: ' + (error.message || 'Unknown error'),
                        },
                    ]);
                    scrollToBottom();
                }
            };

            // Timeout 90s, chỉ nếu chưa chunk
            timeoutId = setTimeout(() => {
                if (!chunkReceived) {
                    console.log('⏰ Stream timeout');
                    endStream(new Error('Timeout'));
                }
            }, 90000);

            try {
                const formData = new FormData();
                formData.append('user_id', 'user321');
                formData.append('message', finalMessage);
                if (hasFile) {
                    formData.append('image', pendingImage!.file as any);
                }

                console.log('🔍 Starting fetch stream...');

                const response = await fetch('http://192.168.101.95:8000/chat/stream', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                if (!response.body) {
                    throw new Error('No response body');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                let updateCounter = 0; // Fix: Local let, không static

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    let lines = buffer.split('\n\n'); // SSE format: chunks separated by \n\n
                    buffer = lines.pop() || ''; // Keep incomplete line

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            let chunk = line.slice(6).trim(); // Parse "data: chunk"
                            if (chunk) {
                                // Fix text: Add space/newline nếu cần
                                if (chunk && !/\s$/.test(chunk) && !/[\.\!\?\n]$/.test(chunk)) {
                                    chunk += ' ';
                                }
                                botTextRef.current += chunk;
                                chunkReceived = true;
                                console.log('📦 Received chunk:', chunk);

                                // Update UI mỗi 3 chunks để tránh lag (batch)
                                updateCounter++;
                                if (updateCounter % 3 === 0) {
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === botMsgId
                                                ? { ...msg, text: botTextRef.current, isPending: false }
                                                : msg
                                        )
                                    );
                                    scrollToBottom();
                                }
                            }
                        }
                    }
                }

                // End sau full read
                console.log('🏁 Stream ended');
                endStream();

            } catch (err: any) {
                console.error('💥 Stream error:', err);
                endStream(err);
            }
        }, 500); // Debounce delay
    };

    const clearChat = () => {
        if (isStreaming || loading) return;
        setMessages([
            {
                id: Date.now().toString(),
                sender: 'bot',
                text: 'Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.',
            },
        ]);
        setPendingImage(null);
        setInput('');
        setIsStreaming(false);
        botTextRef.current = '';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>💬 Test Chatbot Streaming (với Image Preview)</Text>
            </View>

            <ScrollView
                ref={scrollRef}
                style={styles.chatContainer}
                contentContainerStyle={styles.chatContent}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.message,
                            msg.sender === 'user'
                                ? styles.userMessage
                                : msg.sender === 'error'
                                    ? styles.errorMessage
                                    : styles.botMessage,
                            msg.isPending && styles.pendingMessage,
                        ]}
                    >
                        {msg.image ? (
                            <View>
                                <Text style={styles.senderLabel}>Bạn:</Text>
                                {msg.text && <Text style={styles.messageText}>{msg.text}</Text>}
                                <Image source={{ uri: msg.image }} style={styles.messageImage} />
                                {msg.isPending && (
                                    <Text style={styles.pendingText}>
                                        📝 Preview - Nhấn Gửi để xác nhận
                                    </Text>
                                )}
                            </View>
                        ) : msg.sender === 'user' ? (
                            <View>
                                <Text style={styles.senderLabel}>Bạn:</Text>
                                <Text style={styles.messageText}>{msg.text}</Text>
                            </View>
                        ) : msg.sender === 'bot' ? (
                            <View>
                                <Text style={styles.senderLabel}>Bot:</Text>
                                {msg.isPending ? (
                                    <Text style={styles.messageText}>Đang suy nghĩ...</Text>
                                ) : (
                                    <MarkdownDisplay style={markdownStyles}>{msg.text}</MarkdownDisplay>
                                )}
                            </View>
                        ) : (
                            <Text style={styles.errorText}>{msg.text}</Text>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.inputContainer}>
                <TouchableOpacity
                    onPress={handleImageUpload}
                    disabled={loading || isStreaming}
                    style={[styles.imageButton, (loading || isStreaming) && styles.disabledButton]}
                >
                    <Text style={styles.buttonText}>📷 Ảnh</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.textInput}
                    placeholder={
                        pendingImage
                            ? 'Nhập mô tả cho ảnh (ví dụ: bệnh gì, cách chữa)...'
                            : 'Nhập tin nhắn của bạn...'
                    }
                    value={input}
                    onChangeText={setInput}
                    onSubmitEditing={() => !loading && !isStreaming && sendMessage()}
                    editable={!loading && !isStreaming}
                    multiline
                    returnKeyType="send"
                />

                <TouchableOpacity
                    onPress={() => !loading && !isStreaming && sendMessage()}
                    disabled={loading || isStreaming}
                    style={[styles.sendButton, (loading || isStreaming) && styles.disabledButton]}
                >
                    <Text style={styles.buttonText}>
                        {loading || isStreaming ? 'Đang stream...' : 'Gửi'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={clearChat}
                    disabled={loading || isStreaming}
                    style={[styles.clearButton, (loading || isStreaming) && styles.disabledButton]}
                >
                    <Text style={styles.buttonText}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Styles giữ nguyên
interface Styles {
    container: ViewStyle;
    header: ViewStyle;
    title: TextStyle;
    chatContainer: ViewStyle;
    chatContent: ViewStyle;
    message: ViewStyle;
    userMessage: ViewStyle;
    botMessage: ViewStyle;
    errorMessage: ViewStyle;
    pendingMessage: ViewStyle;
    senderLabel: TextStyle;
    messageText: TextStyle;
    errorText: TextStyle;
    messageImage: ImageStyle;
    pendingText: TextStyle;
    inputContainer: ViewStyle;
    imageButton: ViewStyle;
    sendButton: ViewStyle;
    clearButton: ViewStyle;
    disabledButton: ViewStyle;
    buttonText: TextStyle;
    textInput: TextStyle;
}

const styles = StyleSheet.create<Styles>({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2563eb',
    },
    chatContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        backgroundColor: '#ffffff',
    },
    chatContent: {
        flexGrow: 1,
    },
    message: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        maxWidth: maxWidth,
        alignSelf: 'flex-start',
    },
    userMessage: {
        backgroundColor: '#3b82f6',
        alignSelf: 'flex-end',
    },
    botMessage: {
        backgroundColor: '#f3f4f6',
    },
    errorMessage: {
        backgroundColor: '#fecaca',
    },
    pendingMessage: {
        opacity: 0.6,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#93c5fd',
    },
    senderLabel: {
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#374151',
    },
    messageText: {
        color: '#ffffff',
        fontSize: 14,
    },
    errorText: {
        color: '#991b1b',
        fontSize: 14,
    },
    messageImage: {
        borderRadius: 8,
        width: '100%',
        height: 192,
        marginTop: 8,
        resizeMode: 'cover',
    },
    pendingText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 4,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    imageButton: {
        backgroundColor: '#16a34a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    sendButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    clearButton: {
        backgroundColor: '#d1d5db',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#9ca3af',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        backgroundColor: '#ffffff',
    },
});

// Markdown styles giữ nguyên
const markdownStyles = {
    body: {
        color: '#374151',
        fontSize: 14,
    },
    paragraph: {
        marginBottom: 8,
    },
    table: {
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
};