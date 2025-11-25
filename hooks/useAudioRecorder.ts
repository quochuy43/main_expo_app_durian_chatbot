import { ChatService } from "@/services/chatService";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export function useAudioRecorder(onTextReceived: (text: string) => void) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    // recording: Lưu trữ object Audio.Recording từ Expo. Nó sẽ là null khi không ghi âm.
    // seconds: Lưu trữ thời gian ghi âm (tính bằng giây).
    // isProcessing: Boolean quan trọng chỉ ra rằng đã bấm nút Stop nhưng đang chờ Back-end xử lý (gửi file lên và nhận text về).

    useEffect(() => {
        let interval: any;
        if (recording) {
            interval = setInterval(() => setSeconds((s) => s + 1), 1000);
        } else {
            clearInterval(interval);
            setSeconds(0);
        }
        return () => clearInterval(interval);
    }, [recording]);
    // Đây là cách React tạo ra một đồng hồ đếm ngược chỉ chạy khi biến recording có giá trị.


    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (!permission.granted) {
                Alert.alert("Quyền truy cập", "Cần quyền truy cập microphone.");
                return;
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) {
            console.error("Start recording failed", err);
        }
    };
    // gọi Audio.Recording.createAsync để bắt đầu một phiên ghi âm mới và lưu object vào state recording.

    const stopRecording = async () => {
        if (!recording) return;
        setIsProcessing(true);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI(); // Lấy đường dẫn cục bộ (Local URI) của file âm thanh vừa ghi
            setRecording(null);
            if (uri) {
                const data = await ChatService.uploadAudio(uri);
                onTextReceived(data.text); //Gọi hàm callback được truyền vào hook để chuyển văn bản nhận được từ Back-end sang hook useChatLogic (nơi xử lý tin nhắn) để hiển thị.
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Lỗi xử lý âm thanh");
        } finally {
            setIsProcessing(false);
        }
    };

    return { recording, seconds, isProcessing, startRecording, stopRecording };
}