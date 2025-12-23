import { ThemedText } from '@/components/themed-text';
import { useTourGuide } from '@/contexts/TourGuideContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function OnboardingScreen() {
    const router = useRouter();
    const { startTour, skipTour } = useTourGuide();

    const handleNeedTour = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        startTour();
        router.replace('/camera');
    };

    const handleSkipTour = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
        await skipTour();
        router.replace('/camera');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
                {/* Question Card */}
                <Animated.View
                    entering={FadeInDown.delay(200).duration(600)}
                    style={styles.cardContainer}
                >
                    <View style={styles.card}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="help-circle" size={40} color="#27ae60" />
                        </View>

                        <ThemedText style={styles.questionTitle}>
                            Bạn đã quen thuộc với{'\n'}ứng dụng này chưa?
                        </ThemedText>

                        <ThemedText style={styles.questionSubtitle}>
                            Chúng tôi có thể hướng dẫn bạn cách sử dụng các tính năng chính
                        </ThemedText>

                        {/* Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleNeedTour}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="compass-outline" size={24} color="#fff" />
                                <ThemedText style={styles.primaryButtonText}>
                                    Chưa, hướng dẫn tôi
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={handleSkipTour}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="rocket-outline" size={24} color="#27ae60" />
                                <ThemedText style={styles.secondaryButtonText}>
                                    Rồi, bắt đầu thôi
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    safeArea: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    cardContainer: {
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    questionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 30,
    },
    questionSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#27ae60',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
        shadowColor: '#27ae60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f9f3',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
        borderWidth: 2,
        borderColor: '#27ae60',
    },
    secondaryButtonText: {
        color: '#27ae60',
        fontSize: 17,
        fontWeight: '600',
    },
});
