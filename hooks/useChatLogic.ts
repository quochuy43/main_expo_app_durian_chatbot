import { useAuth } from '@/contexts/AuthContext';
import { ChatService } from "@/services/chatService";
import { Message, PendingImage } from "@/types/chat";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import { Alert, FlatList } from "react-native";

const generateUniqueId = () => `${Date.now()}-${Math.random()}`;

export function useChatLogic() {
    const { token } = useAuth();
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

    // Set image from external source (camera page)
    const setExternalImage = (uri: string, name: string, type: string) => {
        const file = { uri, name, type };
        setPendingImage({ uri, file });

        // Add preview message
        setMessages(prev => [
            ...prev.filter(m => !m.isPending),
            { id: generateUniqueId(), sender: "user", text: "", image: uri, isPending: true }
        ]);
    };

    const normalizeUnicode = (text: string) => {
        try {
            return text.normalize("NFC");
        } catch {
            return text;
        }
    };

    const normalizeChunk = (prev: string, chunk: string) => {
        let text = chunk;

        // 1️⃣ Fix unicode tiếng Việt
        text = normalizeUnicode(text);

        // 2️⃣ Fix missing space
        if (prev && !prev.endsWith(" ") && !text.startsWith(" ")) {
            // Thêm space sau dấu câu (logic mới, ưu tiên)
            if (
                /[,!.?:;'"()[\]{}–—…]$/.test(prev) &&  // Kết thúc bằng dấu câu mở rộng
                /^[a-zA-ZÀ-ỹ0-9]/.test(text)  // Bắt đầu bằng chữ/số
            ) {
                text = " " + text;
            }
            // Fallback: Thêm space giữa chữ/số nếu không phải dấu câu (để tránh dính từ)
            else if (
                /[a-zA-ZÀ-ỹ0-9]$/.test(prev) &&  // Prev kết thúc bằng chữ/số
                /^[a-zA-ZÀ-ỹ0-9]/.test(text)  // Chunk bắt đầu bằng chữ/số
            ) {
                text = " " + text;
            }
        }

        return text;
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

        let fullText = "";

        try {
            const source = await ChatService.streamChat(
                finalMessage,
                token ?? undefined,
                imageFile
            );

            /** 2️⃣ STREAM TOKEN REAL-TIME */
            source.addEventListener("message", (event) => {
                const chunk = event.data as string;
                fullText += normalizeChunk(fullText, chunk);

                setMessages(prev =>
                    prev.map(m =>
                        m.id === botMsgId
                            ? { ...m, text: fullText.normalize("NFC") }
                            : m
                    )
                );

                if (isScrolledToBottom && !userInteracted) {
                    scrollToBottom(false);
                }
            });



            /** 3️⃣ END EVENT */
            source.addEventListener("end" as any, () => {
                source.close();
                setLoading(false);
                if (isScrolledToBottom) scrollToBottom(false);
            });

            /** 4️⃣ ERROR */
            source.addEventListener("error", (err) => {
                console.error("SSE error:", err);
                source.close();

                setMessages(prev => [
                    ...prev.filter(m => m.id !== botMsgId),
                    {
                        id: generateUniqueId(),
                        sender: "error",
                        text: "❌ Lỗi kết nối tới máy chủ",
                    },
                ]);

                setLoading(false);
            });

        } catch (err: any) {
            console.error(err);
            setMessages(prev => [
                ...prev.filter(m => m.id !== botMsgId),
                {
                    id: generateUniqueId(),
                    sender: "error",
                    text: "❌ Lỗi: " + (err?.message || "Unknown"),
                },
            ]);
            setLoading(false);
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
        setExternalImage,
    };
}
// overrideText: Tham số này rất quan trọng. Khi người dùng ghi âm, useAudioRecorder sẽ gọi hàm này với văn bản đã được ASR xử lý, cho phép logic chat chạy mà không cần người dùng gõ.