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
    // Type cho biến là mảng của interface Message
    // messages là mảng các đối tượng Message
    const [messages, setMessages] = useState<Message[]>([
        {
            id: generateUniqueId(),
            sender: 'bot',
            text: 'Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.',
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // pendingImage: Lưu ảnh khi người dùng chọn (chưa gửi)
    //setPendingImage: Cập nhật ảnh
    //{ uri: string; file: any }: Object chứa đường dẫn ảnh và file. | null: có thể không có ảnh và giá trị khởi tạo là null (chưa có ảnh)
    const [pendingImage, setPendingImage] = useState<{ uri: string; file: any } | null>(null);
    // Tham chiếu trực tiếp đến component ScrollView
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        return () => {
            // Optional: Cleanup nếu cần, nhưng expo tự handle
        };
    }, [pendingImage]);

    const scrollToBottom = () => {
        scrollRef.current?.scrollToEnd({ animated: true });
    };

    // Dependency [messages]: Chạy khi mảng messages thay đổi
    // Chức năng: Mỗi khi có tin nhắn mới → tự động cuộn xuống cuối
    // UX: Người dùng luôn thấy tin nhắn mới nhất
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleImageUpload = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần quyền truy cập gallery để chọn ảnh.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',  // Chỉ cho chọn ảnh
            allowsEditing: true, // Cho phép chỉnh sửa/cắt ảnh trước khi chọn
            aspect: [4, 3], // Tỷ lệ khung hình 4:3
            quality: 1, // Chất lượng ảnh cao nhất
        });

        // result trả về:
        //{
        //   canceled: false,        // false = chọn ảnh, true = hủy
        //   assets: [
        //     {
        //       uri: 'file://...',   // Đường dẫn ảnh
        //       width: 800,
        //       height: 600,
        //       fileName: 'image.jpg'
        //     }
        //   ]
        // }

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0]; // Lấy ảnh đầu tiên trong mảng assets
            const imageUri = asset.uri; // Đường dẫn ảnh
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
            // prev là giá trị hiện tại (previous state) của messages — React truyền vào tự động cho bạn.
            // [...] là spread operator: ...prev sao chép tất cả phần tử hiện có trong mảng prev.
            // [...prev, previewMsg] tạo một mảng mới chứa tất cả tin nhắn cũ, sau đó thêm previewMsg vào cuối.
            setMessages((prev) => [...prev, previewMsg]);
        }
    };

    const sendMessage = async (messageText?: string) => {
        const message = messageText || input.trim();
        const hasFile = pendingImage?.file;
        if (!message && !hasFile) return;

        const finalMessage = message || (hasFile ? 'Hãy giới thiệu về' : '');
        // sao chép mảng messages hiện tại vào biến cục bộ để thao tác (không mutate trực tiếp state).
        let updatedMessages = [...messages];

        if (hasFile) {
            updatedMessages = updatedMessages.map((msg) =>
                msg.isPending
                    ? { ...msg, isPending: false, text: finalMessage }
                    : msg,
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

        const botMsg: Message = {
            id: generateUniqueId(),
            sender: 'bot',
            text: 'Đang suy nghĩ...',
        };
        updatedMessages.push(botMsg);
        setMessages(updatedMessages);
        scrollToBottom();

        // tạo cơ chế hủy request nếu server không phản hồi trong 30s
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const formData = new FormData();
            formData.append('user_id', 'user321');
            formData.append('message', finalMessage);
            if (hasFile) {
                formData.append('image', pendingImage!.file as any);
            }

            console.log('🔍 Sending request with native fetch...');

            const response = await fetch('http://192.168.101.95:8000/chat/stream', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
                // Không set 'Content-Type' explicit để fetch tự handle boundary cho FormData
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            console.log('✅ Response OK, body exists:', !!response.body);

            // Fallback: Đọc full text và simulate typing để UX mượt (vì native fetch ở RN không hỗ trợ stream ổn định với FormData)
            console.log('🔄 Reading full response + simulate typing');
            const fullText = await response.text();
            if (!fullText) {
                throw new Error('Empty response from backend');
            }

            // Simulate typing effect (giống stream, 30ms/word)
            let displayText = '';
            const words = fullText.split(' ');
            for (let i = 0; i < words.length; i++) {
                displayText += (i > 0 ? ' ' : '') + words[i];
                updatedMessages[updatedMessages.length - 1].text = displayText;
                setMessages([...updatedMessages]);
                scrollToBottom();
                await new Promise((resolve) => setTimeout(resolve, 30));  // 30ms per word
            }

        } catch (err: any) {
            console.error('💥 Error:', err);
            const withoutBot = updatedMessages.slice(0, -1);
            setMessages([
                ...withoutBot,
                {
                    id: generateUniqueId(),
                    sender: 'error',
                    text: '❌ Lỗi khi gửi: ' + (err.message || 'Unknown error'),
                },
            ]);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
            scrollToBottom();
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: Date.now().toString(),
                sender: 'bot',
                text: 'Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.',
            },
        ]);
        setPendingImage(null);
        setInput('');
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
                                <MarkdownDisplay style={markdownStyles}>{msg.text}</MarkdownDisplay>
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
                    disabled={loading}
                    style={[styles.imageButton, loading && styles.disabledButton]}
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
                    onSubmitEditing={() => !loading && sendMessage()}
                    editable={!loading}
                    multiline
                />

                <TouchableOpacity
                    onPress={() => !loading && sendMessage()}
                    disabled={loading}
                    style={[styles.sendButton, loading && styles.disabledButton]}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Đang gửi...' : 'Gửi'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={clearChat}
                    disabled={loading}
                    style={[styles.clearButton, loading && styles.disabledButton]}
                >
                    <Text style={styles.buttonText}>Xóa</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Tách riêng ViewStyle, TextStyle, ImageStyle
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

// Style riêng cho Markdown
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