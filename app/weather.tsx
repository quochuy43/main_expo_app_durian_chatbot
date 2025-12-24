import { WEATHER_API_KEY } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated'; // Cài bằng: npx expo install react-native-reanimated

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CACHE_KEY_WEATHER = 'weather_cache';
const CACHE_KEY_LOCATION = 'user_location';
const CACHE_DURATION = 10 * 60 * 1000; // 10 phút

interface WeatherData {
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    weather: {
        id: number;
        main: string;
        description: string;
        icon: string;
    }[];
    wind: {
        speed: number;
        deg: number;
    };
    clouds: {
        all: number;
    };
    visibility: number;
    name: string;
    sys: {
        country: string;
    };
}

const OPENWEATHER_TRANSLATIONS: Record<string, string> = {
    // --- Group 2xx: Thunderstorm (Giông bão) ---
    'thunderstorm with light rain': 'Giông bão kèm mưa nhỏ',
    'thunderstorm with rain': 'Giông bão kèm mưa',
    'thunderstorm with heavy rain': 'Giông bão kèm mưa lớn',
    'light thunderstorm': 'Giông bão nhẹ',
    'thunderstorm': 'Giông bão',
    'heavy thunderstorm': 'Giông bão lớn',
    'ragged thunderstorm': 'Giông bão dữ dội',
    'thunderstorm with light drizzle': 'Giông bão kèm mưa phùn nhẹ',
    'thunderstorm with drizzle': 'Giông bão kèm mưa phùn',
    'thunderstorm with heavy drizzle': 'Giông bão kèm mưa phùn lớn',

    // --- Group 3xx: Drizzle (Mưa phùn) ---
    'light intensity drizzle': 'Mưa phùn nhẹ',
    'drizzle': 'Mưa phùn',
    'heavy intensity drizzle': 'Mưa phùn lớn',
    'light intensity drizzle rain': 'Mưa phùn và mưa nhỏ',
    'drizzle rain': 'Mưa phùn và mưa',
    'heavy intensity drizzle rain': 'Mưa phùn và mưa lớn',
    'shower rain and drizzle': 'Mưa rào và mưa phùn',
    'heavy shower rain and drizzle': 'Mưa rào lớn và mưa phùn',
    'shower drizzle': 'Mưa phùn rào',

    // --- Group 5xx: Rain (Mưa) ---
    'light rain': 'Mưa nhỏ',
    'moderate rain': 'Mưa vừa',
    'heavy intensity rain': 'Mưa lớn',
    'very heavy rain': 'Mưa rất lớn',
    'extreme rain': 'Mưa cực lớn',
    'freezing rain': 'Mưa đóng băng',
    'light intensity shower rain': 'Mưa rào nhẹ',
    'shower rain': 'Mưa rào',
    'heavy intensity shower rain': 'Mưa rào lớn',
    'ragged shower rain': 'Mưa rào nặng hạt',

    // --- Group 6xx: Snow (Tuyết) ---
    'light snow': 'Tuyết nhẹ',
    'snow': 'Tuyết',
    'heavy snow': 'Tuyết lớn',
    'sleet': 'Mưa tuyết',
    'light shower sleet': 'Mưa tuyết rào nhẹ',
    'shower sleet': 'Mưa tuyết rào',
    'light rain and snow': 'Mưa và tuyết nhẹ',
    'rain and snow': 'Mưa và tuyết',
    'light shower snow': 'Tuyết rào nhẹ',
    'shower snow': 'Tuyết rào',
    'heavy shower snow': 'Tuyết rào lớn',

    // --- Group 7xx: Atmosphere (Khí quyển/Sương mù) ---
    'mist': 'Sương mù',
    'smoke': 'Khói',
    'haze': 'Sương mù khô',
    'sand/ dust whirls': 'Cát/bụi cuộn',
    'fog': 'Sương dày đặc',
    'sand': 'Cát',
    'dust': 'Bụi',
    'volcanic ash': 'Tro núi lửa',
    'squalls': 'Dông tố/Gió giật mạnh',
    'tornado': 'Lốc xoáy',

    // --- Group 8xx: Clouds (Mây) ---
    'clear sky': 'Trời quang mây tạnh', // ID 800
    'few clouds': 'Ít mây: 11-25%', // ID 801
    'scattered clouds': 'Mây rải rác: 25-50%', // ID 802 (Ví dụ của bạn)
    'broken clouds': 'Mây cụm rải rác: 51-84%', // ID 803
    'overcast clouds': 'Trời nhiều mây: 85-100%', // ID 804
};

const VIETNAM_CITY_NAMES: Record<string, string> = {
    'Ho Chi Minh City': 'Hồ Chí Minh',
    'Hanoi': 'Hà Nội',
    'Ap Ba': 'Đà Nẵng',
    'Hue': 'Huế',
    'Bentre': 'Bến Tre'
};

// Thêm mẹo cho nông dân trồng sầu riêng dựa trên thời tiết
const DURAN_FARMER_TIPS: Record<string, string> = {
    'rain': 'Mưa vừa phải: Thời gian lý tưởng để tưới nước cho cây sầu riêng. Tránh ngập úng!',
    'clouds': 'Trời nhiều mây: Giảm tưới nước, theo dõi sâu bệnh vì độ ẩm cao.',
    'clear': 'Trời nắng: Tăng tưới nước vào buổi sáng/tối để tránh cháy lá.',
    'thunderstorm': 'Giông bão: Bảo vệ cây non, kiểm tra hệ thống thoát nước.',
    'default': 'Theo dõi thời tiết hàng ngày để chăm sóc vườn sầu riêng hiệu quả.',
};

const translateAndTitleCase = (englishDescription: string): string => {
    const normalizedDescription = englishDescription.toLowerCase();

    // Dịch
    const translated = OPENWEATHER_TRANSLATIONS[normalizedDescription] || englishDescription;

    // Viết hoa chữ cái đầu (Title Case)
    // Lấy ký tự đầu tiên và chuyển thành chữ hoa, sau đó nối với phần còn lại của chuỗi
    if (translated.length === 0) return '';
    return translated.charAt(0).toUpperCase() + translated.slice(1);
};

const getDisplayCityName = (apiName: string): string => {
    // Fallback: Nếu không khớp map, dùng name gốc (có thể dịch thủ công sau)
    return VIETNAM_CITY_NAMES[apiName] || apiName;
};

const getFarmerTip = (mainType: string): string => {
    return DURAN_FARMER_TIPS[mainType.toLowerCase()] || DURAN_FARMER_TIPS.default;
};

const WeatherScreen: React.FC = () => {
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // Animation values
    const tempScale = useSharedValue(0.8);
    const iconOpacity = useSharedValue(0);

    React.useEffect(() => {
        if (data) {
            tempScale.value = withSpring(1, { damping: 10 });
            iconOpacity.value = withTiming(1, { duration: 1000 });
        }
    }, [data]);

    const animatedTempStyle = useAnimatedStyle(() => ({
        transform: [{ scale: tempScale.value }],
    }));

    const animatedIconStyle = useAnimatedStyle(() => ({
        opacity: iconOpacity.value,
    }));

    // Hàm lấy location từ GPS hoặc cache
    const getLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
        try {
            // Kiểm tra cache location trước
            const cachedLoc = await AsyncStorage.getItem(CACHE_KEY_LOCATION);
            if (cachedLoc) {
                const { latitude, longitude, timestamp } = JSON.parse(cachedLoc);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setLocation({ latitude, longitude });
                    return { latitude, longitude };
                }
            }

            // Yêu cầu quyền và lấy GPS
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Cần quyền vị trí', 'Vui lòng bật vị trí để dự báo chính xác. Sẽ dùng Huế mặc định.');
                return null; // Fallback
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setLocation(coords);

            // Lưu cache location
            await AsyncStorage.setItem(CACHE_KEY_LOCATION, JSON.stringify({
                ...coords,
                timestamp: Date.now(),
            }));

            return coords;
        } catch (err) {
            console.error('Lỗi GPS:', err);
            return null; // Fallback
        }
    }, []);

    // Hàm fetch weather (dùng lat/lon hoặc city)
    const fetchWeather = useCallback(async (coords?: { latitude: number; longitude: number }) => {
        try {
            setLoading(true);
            setError(null);

            // Kiểm tra cache weather
            const cachedData = await AsyncStorage.getItem(CACHE_KEY_WEATHER);
            if (cachedData) {
                const { data: cached, timestamp } = JSON.parse(cachedData);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    setData(cached);
                    return; // Dùng cache
                }
            }

            // Xây URL: Ưu tiên lat/lon, fallback city
            let URL: string;
            if (coords) {
                URL = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${WEATHER_API_KEY}&units=metric&lang=vi`;
            } else {
                URL = `https://api.openweathermap.org/data/2.5/weather?q=Hue&appid=${WEATHER_API_KEY}&units=metric&lang=vi`;
            }

            const response = await fetch(URL);
            if (!response.ok) throw new Error('Failed to fetch weather data');
            const jsonData: WeatherData = await response.json();
            setData(jsonData);
            console.log('API Response - City Name:', jsonData.name);
            console.log('Full Data:', getDisplayCityName(jsonData.name));

            // Lưu cache
            await AsyncStorage.setItem(CACHE_KEY_WEATHER, JSON.stringify({
                data: jsonData,
                timestamp: Date.now(),
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load ban đầu
    React.useEffect(() => {
        const init = async () => {
            const coords = await getLocation();
            await fetchWeather(coords);
        };
        init();
    }, [getLocation, fetchWeather]);

    // Nếu dùng React Navigation: Refresh khi focus (tối ưu, chỉ fetch khi cần)
    // Import: import { useFocusEffect } from '@react-navigation/native';
    // useFocusEffect(useCallback(() => { fetchWeather(location); }, [fetchWeather, location]));

    if (loading) {
        return (
            <LinearGradient colors={['#4A90E2', '#50C9C3']} style={styles.container}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Đang tải thời tiết cho vườn sầu riêng...</Text>
                </View>
            </LinearGradient>
        );
    }

    if (error || !data) {
        return (
            <LinearGradient colors={['#4A90E2', '#50C9C3']} style={styles.container}>
                <View style={styles.centerContainer}>
                    <Ionicons name="cloud-offline-outline" size={80} color="#fff" />
                    <Text style={styles.errorText}>Lỗi tải dữ liệu: {error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => fetchWeather(location)}
                    >
                        <Text style={styles.retryButtonText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        );
    }

    const { main, weather, wind, clouds, visibility, name } = data;
    const currentWeather = weather[0];
    const iconUrl = `http://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`; // Icon lớn hơn

    // Dynamic gradient dựa trên weather.main (thêm tông xanh lá cho nông nghiệp)
    const getGradientColors = (mainType: string): string[] => {
        switch (mainType.toLowerCase()) {
            case 'clear': return ['#56ab2f', '#a8e6cf', '#dcedc1']; // Xanh lá tươi cho nắng
            case 'clouds': return ['#a8a8a8', '#c6c6c6', '#e0e0e0']; // Xám nhạt cho mây
            case 'rain': return ['#4A90E2', '#50C9C3', '#A8E6CF']; // Xanh dương cho mưa
            case 'thunderstorm': return ['#2C3E50', '#34495E', '#7F8C8D']; // Tối cho giông
            default: return ['#56ab2f', '#a8e6cf', '#dcedc1'];
        }
    };
    const gradientColors = getGradientColors(currentWeather.main);

    const displayCity = getDisplayCityName(name);
    const farmerTip = getFarmerTip(currentWeather.main);

    return (
        <LinearGradient colors={gradientColors} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header: Vị trí với animation fade in */}
                <Animated.View entering={FadeIn.duration(800).delay(200)} style={styles.locationHeader}>
                    <View style={styles.cityContainer}>
                        <Ionicons name="location-outline" size={28} color="#fff" />
                        <Text style={styles.cityText}>{displayCity}, Việt Nam</Text>
                    </View>
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </Animated.View>

                {/* Main Weather với animation */}
                <Animated.View style={[styles.mainWeather, animatedIconStyle]}>
                    <Image source={{ uri: iconUrl }} style={styles.weatherIcon} />
                    <Animated.Text style={[styles.temperature, animatedTempStyle]}>
                        {Math.round(main.temp)}°
                    </Animated.Text>
                    <Text style={styles.description}>{translateAndTitleCase(currentWeather.description)}</Text>
                </Animated.View>

                {/* Mẹo cho nông dân */}
                <Animated.View entering={FadeIn.duration(1000).delay(400)} style={styles.tipContainer}>
                    <Ionicons name="bulb-outline" size={24} color="#56ab2f" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Mẹo cho vườn sầu riêng</Text>
                        <Text style={styles.tipText}>{farmerTip}</Text>
                    </View>
                </Animated.View>

                {/* Details Grid với shadow và animation */}
                <Animated.View entering={FadeIn.duration(1200).delay(600)} style={styles.detailsContainer}>
                    {[
                        {
                            icon: "water-outline",
                            label: "Độ ẩm",
                            value: `${main.humidity}%`,
                            description: `${clouds.all}% mây che phủ`,
                        },
                        {
                            icon: "speedometer-outline",
                            label: "Gió",
                            value: `${wind.speed} m/s`,
                            description: `${wind.deg}°`,
                        },
                        {
                            icon: "eye-outline",
                            label: "Tầm nhìn",
                            value: `${visibility / 1000} km`,
                        },
                        {
                            icon: "bar-chart-outline",
                            label: "Áp suất",
                            value: `${main.pressure} hPa`,
                        },
                        {
                            icon: "thermometer-outline",
                            label: "Cảm giác",
                            value: `${Math.round(main.feels_like)}°`,
                        },
                        {
                            icon: "swap-vertical-outline",
                            label: "Min/Max",
                            value: `${Math.round(main.temp_min)}° / ${Math.round(main.temp_max)}°`,
                        },
                    ].map((item, index) => (
                        <DetailItem
                            key={item.label}
                            icon={item.icon}
                            label={item.label}
                            value={item.value}
                            description={item.description}
                            delay={index * 100}
                        />
                    ))}
                </Animated.View>

                {/* Footer với nút refresh */}
                <Animated.View entering={FadeIn.duration(1500).delay(800)} style={styles.footer}>
                    <TouchableOpacity style={styles.refreshButton} onPress={() => fetchWeather(location)}>
                        <Ionicons name="refresh-outline" size={20} color="#e9ffdf" />
                        <Text style={styles.refreshButtonText}>Cập nhật thời tiết</Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </LinearGradient>
    );
};

// Type này thường được export từ thư viện
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Sub-component cho detail items với animation
const DetailItem: React.FC<{
    icon: IoniconsName;
    label: string;
    value: string;
    description?: string;
    delay?: number;
}> = ({ icon, label, value, description, delay = 0 }) => (
    <Animated.View
        entering={FadeIn.duration(500).delay(delay)}
        style={styles.detailItem}
    >
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={24} color="#56ab2f" />
        </View>
        <View style={styles.detailText}>
            <Text style={styles.detailLabel}>{label}</Text>
            {description && <Text style={styles.detailDesc}>{description}</Text>}
        </View>
        <Text style={styles.detailValue}>{value}</Text>
    </Animated.View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '500',
    },
    errorText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    locationHeader: {
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 10,
    },
    cityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cityText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5,
        marginLeft: 8,
    },
    dateText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
        fontStyle: 'italic',
    },
    mainWeather: {
        alignItems: 'center',
        marginBottom: 30,
    },
    weatherIcon: {
        width: 140,
        height: 140,
        marginBottom: 15,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    temperature: {
        fontSize: 96,
        fontWeight: '200',
        color: '#fff',
        letterSpacing: -3,
        marginTop: -20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    description: {
        fontSize: 22,
        color: 'rgba(255,255,255,0.95)',
        fontWeight: '600',
        marginTop: 5,
    },
    tipContainer: {
        backgroundColor: '#ffffff',
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 16,
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tipContent: {
        flex: 1,
        marginLeft: 12,
    },
    tipTitle: {
        fontSize: 16,
        color: '#4b4b4b',
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tipText: {
        fontSize: 14,
        color: 'rgba(255, 172, 77, 0.9)',
        lineHeight: 20,
    },
    detailsContainer: {
        flex: 1,
        marginTop: 10,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 18,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailText: {
        flex: 1,
        marginRight: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: '#56ab2f',
        fontWeight: '600',
    },
    detailDesc: {
        fontSize: 14,
        color: '#000',
        marginTop: 2,
    },
    detailValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4b4b4b',
        minWidth: 60,
        textAlign: 'right',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        paddingBottom: 20,
    },
    refreshButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#56ab2f',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    refreshButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
    },
});

export default WeatherScreen;