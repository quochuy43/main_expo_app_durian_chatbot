import { ChatService } from "@/services/chatService";
import { Audio } from "expo-av";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export function useAudioRecorder(onTextReceived: (text: string) => void) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);

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

    const stopRecording = async () => {
        if (!recording) return;
        setIsProcessing(true);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            if (uri) {
                const data = await ChatService.uploadAudio(uri);
                onTextReceived(data.text);
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