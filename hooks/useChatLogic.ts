import { ChatService } from "@/services/chatService";
import { Message, PendingImage } from "@/types/chat";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList } from "react-native";

const generateUniqueId = () => `${Date.now()}-${Math.random()}`;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useChatLogic() {
    const [messages, setMessages] = useState<Message[]>([
        { id: generateUniqueId(), sender: "bot", text: "Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện." },
    ]);
    const [inputMessage, setInputMessage] = useState("");
    const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
    const [loading, setLoading] = useState(false);

    // messages: Mảng chính lưu trữ tất cả tin nhắn đã hiển thị (Message[]).
    // inputMessage: Nội dung người dùng đang gõ.
    // pendingImage: Lưu trữ ảnh đang chờ gửi (dạng PendingImage - nơi chứa URI hiển thị và file upload).
    // loading: Boolean chỉ ra bot đang xử lý tin nhắn.

    // Scroll Logic
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
    const [userInteracted, setUserInteracted] = useState(false);
    const flatListRef = useRef<FlatList<Message>>(null);

    const scrollToBottom = (animated = true) => {
        requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated }));
    };

    useEffect(() => {
        if (isScrolledToBottom && !userInteracted) scrollToBottom(false);
    }, [messages, isScrolledToBottom, userInteracted]);

    // flatListRef: Ref (tham chiếu) đến component <FlatList> để có thể gọi các hàm trực tiếp của nó, như scrollToEnd.
    // useEffect Cuộn: Đảm bảo sau mỗi lần messages thay đổi, nếu người dùng đang ở cuối màn hình (isScrolledToBottom = true) và chưa tương tác (!userInteracted), chat sẽ tự động cuộn xuống tin nhắn mới nhất.

    // Image Picker Logic
    const pickMedia = async (useCamera: boolean) => {
        const permissionFunc = useCamera ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
        const launchFunc = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;

        const { status } = await permissionFunc();
        if (status !== "granted") {
            Alert.alert("Quyền truy cập", `Cần quyền ${useCamera ? 'Camera' : 'Thư viện'} để tiếp tục.`);
            return;
        }

        const result = await launchFunc({
            mediaTypes: ["images"] as any, // Ép kiểu để tránh lỗi type check strict
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const imageUri = asset.uri;
            const file = { uri: imageUri, name: asset.fileName || "photo.jpg", type: asset.mimeType || "image/jpeg" };

            setPendingImage({ uri: imageUri, file });

            // Add preview message
            setMessages(prev => [
                ...prev.filter(m => !m.isPending),
                { id: generateUniqueId(), sender: "user", text: inputMessage.trim(), image: imageUri, isPending: true }
            ]);
        }
    };

    // Send Message Logic
    const sendMessage = async (overrideText?: string) => {
        if (loading) return;
        const textToSend = overrideText || inputMessage.trim();
        const hasFile = Boolean(pendingImage?.file);
        if (!textToSend && !hasFile) return;

        const finalMessage = textToSend || (hasFile ? "Thông tin cơ bản của" : "");
        const imageFile = pendingImage?.file;

        // Optimistic update
        setMessages(prev => {
            const newMsg = { id: generateUniqueId(), sender: "user" as const, text: finalMessage, image: pendingImage?.uri };
            const cleanedPrev = prev.filter(msg => !msg.isPending);
            return [...cleanedPrev, newMsg];
        });

        setInputMessage("");
        setPendingImage(null);
        setLoading(true);
        setUserInteracted(false);

        const botMsgId = generateUniqueId();
        setMessages(prev => [...prev, { id: botMsgId, sender: "bot", text: "Đang suy nghĩ..." }]);
        scrollToBottom(false);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await ChatService.streamChat(finalMessage, "user111", imageFile, controller.signal);
            clearTimeout(timeoutId);

            let fullText = "";

            // Logic Stream Reader (Giữ nguyên logic phức tạp của bạn)
            if (response.body) {
                // @ts-ignore: React Native fetch body sometimes needs casting
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value);
                    fullText += chunk;

                    setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText } : m));
                    if (isScrolledToBottom && !userInteracted) scrollToBottom(false);
                    await delay(100);
                }
            } else {
                // Fallback Logic
                const text = await response.text();
                if (!text) throw new Error("Empty response");

                const words = text.split(" ");
                let currentDisplay = "";
                let batch = "";

                for (let i = 0; i < words.length; i++) {
                    batch += (i > 0 ? " " : "") + words[i];
                    if (i % 5 === 4 || i === words.length - 1) {
                        currentDisplay += batch;
                        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: currentDisplay } : m));
                        batch = "";
                        await delay(150);
                        if (isScrolledToBottom && !userInteracted) scrollToBottom(false);
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            setMessages(prev => [
                ...prev.filter(m => m.id !== botMsgId),
                { id: generateUniqueId(), sender: "error", text: "❌ Lỗi: " + (err?.message || "Unknown") }
            ]);
        } finally {
            setLoading(false);
            setUserInteracted(false);
            if (isScrolledToBottom) scrollToBottom(false);
        }
    };

    return {
        messages,
        inputMessage,
        setInputMessage,
        pendingImage,
        loading,
        flatListRef,
        isScrolledToBottom,
        setIsScrolledToBottom,
        setUserInteracted,
        pickMedia,
        sendMessage,
    };
}
// overrideText: Tham số này rất quan trọng. Khi người dùng ghi âm, useAudioRecorder sẽ gọi hàm này với văn bản đã được ASR xử lý, cho phép logic chat chạy mà không cần người dùng gõ.