import { useEffect, useState } from 'react';
import { subscribeSpeech } from '@/utils/speech';

export function useSpeech() {
    const [speakingId, setSpeakingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeSpeech(setSpeakingId);
        return () => {
            unsubscribe(); // cleanup hợp lệ
        };
    }, []);

    return speakingId;
}
