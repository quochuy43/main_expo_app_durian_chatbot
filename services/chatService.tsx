import { API_URL } from '@/constants/config';
import EventSource from "react-native-sse";


export const ChatService = {
    async uploadAudio(uri: string) {
        const fileName = uri.split("/").pop() ?? "audio.m4a";
        const formData = new FormData();
        formData.append("audio", {
            uri,
            name: fileName,
            type: "audio/m4a",
        } as any);

        const response = await fetch(`${API_URL}/asr`, {
            method: "POST",
            headers: { "Content-Type": "multipart/form-data" },
            body: formData,
        });

        if (!response.ok) throw new Error(`ASR failed: ${response.statusText}`);
        return response.json();
    },

    // Lưu ý về as any:
    // Trong React Native, object { uri, name, type } không đúng chuẩn Blob của web thông thường, nên TypeScript sẽ báo lỗi.
    // Dùng as any là cách bảo TypeScript: "Tôi biết tôi đang làm gì, hãy bỏ qua lỗi này đi, React Native cần object như thế này mới gửi file được".

    async streamChat(
        message: string,
        userId: string,
        token?: string,
        imageFile?: any
    ) {
        const formData = new FormData();
        formData.append("user_id", userId);
        formData.append("message", message);

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const headers: any = {
            Accept: "text/event-stream",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const eventSource = new EventSource(
            `${API_URL}/chat/stream`,
            {
                method: "POST",
                headers,
                body: formData,
            }
        );
        return eventSource;
    }
};

// File này chịu trách nhiệm đóng gói dữ liệu từ Front-end và gửi sang Back-end khớp với những gì Back-end yêu cầu.