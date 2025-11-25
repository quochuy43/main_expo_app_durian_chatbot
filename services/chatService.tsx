import { API_URL } from '@/constants/config';


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

    async streamChat(
        message: string,
        userId: string,
        imageFile?: any,
        signal?: AbortSignal
    ) {
        const formData = new FormData();
        formData.append("user_id", userId);
        formData.append("message", message);

        if (imageFile) {
            formData.append("image", imageFile);
        }

        const response = await fetch(`${API_URL}/chat/stream`, {
            method: "POST",
            body: formData,
            signal,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        return response;
    }
};