import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    ScrollView,
    StatusBar,
    Alert,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';


const { width } = Dimensions.get('window');

const DurianIrrigationScreen = () => {
    // ================= STATE (từ logic cũ) =================
    const [ipAddress, setIpAddress] = useState<string>('192.168.101.153');
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [limitInput, setLimitInput] = useState<string>('80');
    const [moisture, setMoisture] = useState<number>(0);
    const [pumpStatus, setPumpStatus] = useState<'ON' | 'OFF'>('OFF');
    const [target, setTarget] = useState<number>(0);

    const [showSuccess, setShowSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useAuth();

    const ws = useRef<WebSocket | null>(null);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const dropAnim = useRef(new Animated.Value(0)).current;
    const successAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const router = useRouter();

    // ================= WEBSOCKET (logic từ file cũ) =================
    const connectWebSocket = () => {
        if (ws.current) {
            ws.current.close();
        }

        const wsUrl = `ws://${ipAddress}:80/ws`;
        console.log('Đang kết nối tới:', wsUrl);

        try {
            ws.current = new WebSocket(wsUrl);

            ws.current.onopen = () => {
                setIsConnected(true);
                console.log('WebSocket Connected');
            };

            ws.current.onmessage = (event) => {
                try {
                    const json = JSON.parse(event.data);
                    setMoisture(json.moisture);
                    setPumpStatus(json.pump);
                    if (json.target !== undefined) {
                        setTarget(json.target);
                    }
                } catch (err) {
                    console.log('Lỗi parse JSON:', err);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                console.log('WebSocket Disconnected');
            };

            ws.current.onerror = (e) => {
                console.log('WebSocket Error:', e);
            };
        } catch {
            Alert.alert('Lỗi', 'Không thể kết nối WebSocket');
        }
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
            ws.current?.close();
        };
    }, []);

    // ================= HTTP API (logic từ file cũ) =================
    const handleTurnOn = async () => {
        const limitValue = parseInt(limitInput, 10);

        if (isNaN(limitValue) || limitValue < 0 || limitValue > 100) {
            Alert.alert('Lỗi nhập liệu', 'Vui lòng nhập số từ 0 đến 100');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/irrigation/on`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ limit: limitValue }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Không thể bật tưới');
            }

            Alert.alert('Thành công', 'Đã bắt đầu tưới nước');
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể kết nối server');
        } finally {
            setIsLoading(false);
        }
    };



    const handleTurnOff = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/irrigation/off`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Không thể tắt tưới');
            }
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể kết nối server');
        } finally {
            setIsLoading(false);
        }
    };


    // ================= ANIMATIONS =================
    // Check if watering is complete (hiển thị success khi đạt target)
    useEffect(() => {
        if (pumpStatus === 'ON' && moisture >= target && target > 0) {
            setShowSuccess(true);
            Animated.sequence([
                Animated.timing(successAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.delay(2500),
                Animated.timing(successAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowSuccess(false));
        }
    }, [moisture, target, pumpStatus]);

    // Pulse animation for pump
    useEffect(() => {
        if (pumpStatus === 'ON') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [pumpStatus]);

    // Water drop animation
    useEffect(() => {
        if (pumpStatus === 'ON') {
            Animated.loop(
                Animated.timing(dropAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            dropAnim.setValue(0);
        }
    }, [pumpStatus]);

    // Loading rotation
    useEffect(() => {
        if (isLoading) {
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotateAnim.setValue(0);
        }
    }, [isLoading]);

    // ================= HELPER FUNCTIONS =================
    const getMoistureColor = (value: number) => {
        if (value < 40) return '#ef4444';
        if (value < 70) return '#f59e0b';
        return '#10b981';
    };

    const getMoistureStatus = (value: number) => {
        if (value < 40) return 'Khô - Cần tưới gấp';
        if (value < 70) return 'Trung bình';
        return 'Đủ ẩm - Tốt';
    };

    const handleTargetChange = (delta: number) => {
        const currentTarget = parseInt(limitInput, 10) || 80;
        const newTarget = Math.max(60, Math.min(95, currentTarget + delta));
        setLimitInput(newTarget.toString());
    };

    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (circumference * moisture) / 100;

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const dropTranslateY = dropAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 100],
    });

    const successScale = successAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    const successOpacity = successAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient
                colors={['#009e3d', '#ffffff']}
                style={styles.gradient}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <LinearGradient
                                colors={['#fbbf24', '#f59e0b']}
                                style={styles.iconContainer}
                            >
                                <Ionicons name="water" size={24} color="white" />
                            </LinearGradient>
                            <View>
                                <Text style={styles.headerTitle}>Hệ thống tưới</Text>
                                <Text style={styles.headerSubtitle}>Vườn sầu riêng của bạn</Text>
                            </View>
                        </View>
                        <View style={styles.connectionStatus}>
                            <View style={[styles.statusDot, isConnected ? styles.connected : styles.disconnected]} />
                            <Text style={styles.statusText}>{isConnected ? 'Đã kết nối' : 'Mất kết nối'}</Text>
                        </View>
                    </View>

                    {/* Success Message */}
                    {showSuccess && (
                        <Animated.View
                            style={[
                                styles.successCard,
                                {
                                    transform: [{ scale: successScale }],
                                    opacity: successOpacity,
                                },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                            <View style={styles.successTextContainer}>
                                <Text style={styles.successTitle}>Tưới nước hoàn tất!</Text>
                                <Text style={styles.successSubtitle}>Độ ẩm đã đạt mức mong muốn {target}%</Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Main Card */}
                    <View style={styles.mainCard}>
                        {/* Water drops animation */}
                        {pumpStatus === 'ON' && (
                            <View style={styles.dropsContainer}>
                                {[...Array(5)].map((_, i) => (
                                    <Animated.View
                                        key={i}
                                        style={[
                                            styles.waterDrop,
                                            {
                                                left: `${20 + i * 15}%`,
                                                transform: [{ translateY: dropTranslateY }],
                                                opacity: dropAnim,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Moisture Circle */}
                        <View style={styles.circleContainer}>
                            <Svg width={200} height={200}>
                                <Circle
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    stroke="#e5e7eb"
                                    strokeWidth="12"
                                    fill="none"
                                />
                                <Circle
                                    cx="100"
                                    cy="100"
                                    r="90"
                                    stroke={getMoistureColor(moisture)}
                                    strokeWidth="12"
                                    fill="none"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    rotation="-90"
                                    origin="100, 100"
                                />
                            </Svg>
                            <Animated.View
                                style={[
                                    styles.circleContent,
                                    { transform: [{ scale: pulseAnim }] },
                                ]}
                            >
                                <Text style={[styles.moistureValue, { color: getMoistureColor(moisture) }]}>
                                    {moisture}%
                                </Text>
                                <Text style={styles.moistureLabel}>Độ ẩm đất</Text>
                                {pumpStatus === 'ON' && (
                                    <Ionicons name="water" size={20} color="#3b82f6" style={styles.waveIcon} />
                                )}
                            </Animated.View>
                        </View>

                        {/* Status Badge */}
                        <View
                            style={[
                                styles.statusBadge,
                                { backgroundColor: getMoistureColor(moisture) + '20' },
                            ]}
                        >
                            <Text style={[styles.statusBadgeText, { color: getMoistureColor(moisture) }]}>
                                {getMoistureStatus(moisture)}
                            </Text>
                        </View>

                        {/* Target Setting */}
                        <View style={styles.targetCard}>
                            <View style={styles.targetHeader}>
                                <View style={styles.targetLeft}>
                                    <Ionicons name="radio-button-on" size={20} color="#f59e0b" />
                                    <Text style={styles.targetLabel}>Ngưỡng tự động ngắt</Text>
                                </View>
                                <Text style={styles.targetValue}>{limitInput}%</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.targetInput}
                                    value={limitInput}
                                    onChangeText={setLimitInput}
                                    keyboardType="numeric"
                                    maxLength={3}
                                    editable={pumpStatus === 'OFF'}
                                />
                            </View>
                        </View>

                        {/* Progress - chỉ hiển thị khi target > 0 */}
                        {pumpStatus === 'ON' && target > 0 && (
                            <View style={styles.progressCard}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressLabel}>Tiến độ tưới</Text>
                                    <Text style={styles.progressValue}>
                                        {Math.min(100, Math.round((moisture / target) * 100))}%
                                    </Text>
                                </View>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            { width: `${Math.min(100, (moisture / target) * 100)}%` },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Control Buttons */}
                        <View style={styles.controlButtons}>
                            <TouchableOpacity
                                onPress={handleTurnOn}
                                disabled={isLoading || pumpStatus === 'ON'}
                                activeOpacity={0.8}
                                style={{ flex: 1 }}
                            >
                                <LinearGradient
                                    colors={
                                        pumpStatus === 'ON'
                                            ? ['#d1d5db', '#9ca3af']
                                            : ['#01be49', '#01be49']
                                    }
                                    style={[
                                        styles.controlButton,
                                        (isLoading || pumpStatus === 'ON') && styles.buttonDisabled,
                                    ]}
                                >
                                    {isLoading ? (
                                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                            <Ionicons name="refresh" size={24} color="white" />
                                        </Animated.View>
                                    ) : (
                                        <>
                                            <Ionicons name="play" size={24} color="white" />
                                            <Text style={styles.buttonText}>
                                                {pumpStatus === 'ON' ? 'Đang tưới' : 'Bắt đầu tưới'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleTurnOff}
                                disabled={isLoading}
                                activeOpacity={0.8}
                                style={{ flex: 1 }}
                            >
                                <LinearGradient
                                    colors={['#ef4444', '#dc2626']}
                                    style={[
                                        styles.controlButton,
                                        isLoading && styles.buttonDisabled,
                                    ]}
                                >
                                    <Ionicons name="stop" size={24} color="white" />
                                    <Text style={styles.buttonText}>Dừng ngay</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.tipsCard}>
                        <Ionicons name="information-circle" size={20} color="#f59e0b" />
                        <View style={styles.tipsContent}>
                            <Text style={styles.tipsTitle}>Lưu ý: Độ ẩm lý tưởng cho cây từ 70-85%</Text>
                        </View>
                    </View>

                    <View style={styles.statsContainer}>
                        <TouchableOpacity
                            style={styles.historyButton}
                            onPress={() => router.push('/IrrigationHistory')}
                            activeOpacity={0.7}
                        >
                            <View style={styles.statHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="time-outline" size={22} color="#f59e0b" />
                                    <Text style={styles.buttonLabel}>Lịch sử tưới cây</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 30 }} />
                </ScrollView>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#e7efff',
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    connected: {
        backgroundColor: '#10b981',
    },
    disconnected: {
        backgroundColor: '#ef4444',
    },
    statusText: {
        fontSize: 12,
        color: '#ffffff',
    },
    successCard: {
        backgroundColor: '#d1fae5',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#a7f3d0',
    },
    successTextContainer: {
        flex: 1,
    },
    successTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#065f46',
    },
    successSubtitle: {
        fontSize: 14,
        color: '#059669',
    },
    mainCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 20,
        overflow: 'hidden',
    },
    dropsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        zIndex: 1,
    },
    waterDrop: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#60a5fa',
        opacity: 0.6,
    },
    circleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    circleContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moistureValue: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    moistureLabel: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 4,
    },
    waveIcon: {
        marginTop: 8,
    },
    statusBadge: {
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    targetCard: {
        backgroundColor: '#f9fafb',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    targetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    targetLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    targetLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    targetValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f59e0b',
    },
    inputContainer: {
        gap: 12,
    },
    targetInput: {
        backgroundColor: 'white',
        borderWidth: 2,
        borderColor: '#f59e0b',
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        fontWeight: 'bold',
        color: '#f59e0b',
        textAlign: 'center',
    },
    sliderButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sliderButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    progressCard: {
        backgroundColor: '#dbeafe',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e40af',
    },
    progressValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e40af',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#93c5fd',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#2563eb',
    },
    controlButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    statsContainer: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    historyButton: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        // Tạo đổ bóng cho nút (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Tạo đổ bóng cho nút (Android)
        elevation: 3,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Đẩy icon mũi tên sang phải
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginLeft: 10,
    },
    tipsCard: {
        backgroundColor: '#fef3c7',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 2,
        borderColor: '#fde68a',
        alignItems: 'center',
    },
    tipsContent: {
        flex: 1,
    },
    tipsTitle: {
        fontSize: 14,
        color: '#92400e',
        marginBottom: 4,
    }
});

export default DurianIrrigationScreen;