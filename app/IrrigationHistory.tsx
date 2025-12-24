import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import axios from 'axios';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';

interface IrrigationSession {
    id: string;
    start_time: string;
    end_time?: string;
    duration?: number;
    target: number;
    source: string;
}

const IrrigationHistory = () => {
    const [history, setHistory] = useState<IrrigationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedView, setSelectedView] = useState<'chart' | 'list'>('chart');
    const { token } = useAuth();

    const screenWidth = Dimensions.get('window').width;

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/irrigation/history`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setHistory(response.data);
        } catch (error) {
            console.error("Lỗi khi lấy lịch sử:", error);
        } finally {
            setLoading(false);
        }
    };

    // Chuẩn bị dữ liệu cho biểu đồ
    const prepareChartData = () => {
        const last7Sessions = history.slice(0, 7).reverse();

        return {
            labels: last7Sessions.map((item, index) => {
                const date = new Date(item.start_time);
                return `${date.getDate()}/${date.getMonth() + 1}`;
            }),
            datasets: [
                {
                    data: last7Sessions.map(item => item.duration || 0),
                    color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                    strokeWidth: 3
                }
            ]
        };
    };

    // Thống kê tổng quan
    const getStatistics = () => {
        const totalSessions = history.length;
        const autoSessions = history.filter(s => s.source === 'auto').length;
        const manualSessions = history.filter(s => s.source === 'manual').length;
        const totalDuration = history.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

        return { totalSessions, manualSessions, autoSessions, totalDuration, avgDuration };
    };

    const stats = getStatistics();

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#01be49" />
                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>📊 Lịch sử tưới cây</Text>
                <Text style={styles.subtitle}>Theo dõi hoạt động tưới tiêu</Text>
            </View>

            {/* Thống kê tổng quan */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.totalSessions}</Text>
                    <Text style={styles.statLabel}>Tổng lần tưới</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{stats.avgDuration}s</Text>
                    <Text style={styles.statLabel}>Thời gian trung bình</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.autoSessions}</Text>
                    <Text style={styles.statLabel}>Tự động</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={[styles.statNumber, { color: '#eea148' }]}>{stats.manualSessions}</Text>
                    <Text style={styles.statLabel}>Thủ công</Text>
                </View>
            </View>

            {/* Toggle View */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleButton, selectedView === 'chart' && styles.toggleButtonActive]}
                    onPress={() => setSelectedView('chart')}
                >
                    <Text style={[styles.toggleText, selectedView === 'chart' && styles.toggleTextActive]}>
                        📈 Biểu đồ
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, selectedView === 'list' && styles.toggleButtonActive]}
                    onPress={() => setSelectedView('list')}
                >
                    <Text style={[styles.toggleText, selectedView === 'list' && styles.toggleTextActive]}>
                        📋 Danh sách
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Biểu đồ */}
            {selectedView === 'chart' && history.length > 0 && (
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Thời gian tưới 7 lần gần nhất</Text>
                    <LineChart
                        data={prepareChartData()}
                        width={screenWidth - 70}
                        height={220}
                        chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#f8f9fa',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            style: {
                                borderRadius: 16
                            },
                            propsForDots: {
                                r: '6',
                                strokeWidth: '2',
                                stroke: '#2196F3'
                            }
                        }}
                        bezier
                        style={styles.chart}
                    />
                </View>
            )}

            {/* Danh sách chi tiết */}
            {selectedView === 'list' && (
                <View style={styles.listContainer}>
                    <Text style={styles.listTitle}>Chi tiết các lần tưới</Text>
                    {history.map((item, index) => (
                        <View key={item.id} style={styles.historyCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.cardNumber}>
                                    <Text style={styles.cardNumberText}>#{history.length - index}</Text>
                                </View>
                                <View style={[
                                    styles.badge,
                                    { backgroundColor: item.source === 'auto' ? '#E8F5E9' : '#E3F2FD' }
                                ]}>
                                    <Text style={[
                                        styles.badgeText,
                                        { color: item.source === 'auto' ? '#4CAF50' : '#2196F3' }
                                    ]}>
                                        {item.source === 'auto' ? '🤖 Tự động' : '👤 Thủ công'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardContent}>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>🕐 Thời gian:</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(item.start_time).toLocaleString('vi-VN', {
                                            // hour: '2-digit',
                                            // minute: '2-digit',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>⏱️ Thời lượng:</Text>
                                    <Text style={styles.infoValue}>{item.duration || 0} giây</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>💧 Ngưỡng:</Text>
                                    <Text style={styles.infoValue}>{item.target}%</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {history.length === 0 && (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🌱</Text>
                    <Text style={styles.emptyText}>Chưa có dữ liệu tưới cây</Text>
                    <Text style={styles.emptySubtext}>Bắt đầu tưới để ghi nhận lịch sử</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f7fa',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: '#009e3d',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#E3F2FD',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: -20,
    },
    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 15,
        width: '48%',
        marginBottom: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#f13232',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 5,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleButtonActive: {
        backgroundColor: '#01be49',
    },
    toggleText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#ffffff',
    },
    chartContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    chart: {
        borderRadius: 16,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 15,
    },
    historyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardNumber: {
        backgroundColor: '#f5f7fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    cardNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    cardContent: {
        gap: 10,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#999',
    },
});

export default IrrigationHistory;