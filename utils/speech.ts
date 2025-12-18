import * as Speech from 'expo-speech';

/* ================= CLEAN TEXT ================= */

function cleanTextForSpeech(text: string) {
    return text
        // remove code block
        .replace(/```[\s\S]*?```/g, '')
        // inline code
        .replace(/`([^`]+)`/g, '$1')
        // markdown link
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // markdown symbols
        .replace(/[*_~>#-]/g, '')
        // remove emoji
        .replace(/[\p{Extended_Pictographic}]/gu, '')
        // remove extra spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/* ================= SPEECH STATE ================= */

// 🔑 speech state (global nhưng có notify)
let speakingMessageId: string | null = null;

// subscribers (React components)
const listeners = new Set<(id: string | null) => void>();

function notify() {
    listeners.forEach(cb => cb(speakingMessageId));
}

/* ================= PUBLIC API ================= */

export function subscribeSpeech(
    callback: (id: string | null) => void
) {
    listeners.add(callback);

    return () => {
        listeners.delete(callback); // ❗ không return boolean
    };
}


export function speakVietnamese(id: string, text: string) {
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    Speech.stop();

    speakingMessageId = id;
    notify(); // 🔔 báo cho React re-render

    Speech.speak(cleanText, {
        language: 'vi-VN',
        rate: 1.0,
        pitch: 1.0,

        onDone: () => {
            if (speakingMessageId === id) {
                speakingMessageId = null;
                notify();
            }
        },

        onStopped: () => {
            if (speakingMessageId === id) {
                speakingMessageId = null;
                notify();
            }
        },
    });
}

export function stopSpeaking() {
    Speech.stop();
    speakingMessageId = null;
    notify();
}
