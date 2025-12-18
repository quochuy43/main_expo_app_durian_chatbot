import { WEATHER_API_KEY } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons'; // Nếu dùng cho icon bổ sung
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient'; // Cài bằng: npx expo install expo-linear-gradient
import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

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

const WeatherScreen: React.FC = () => {
    const [data, setData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Đang tải thời tiết...</Text>
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="cloud-offline-outline" size={80} color="#fff" />
                <Text style={styles.errorText}>Lỗi tải dữ liệu: {error}</Text>
            </View>
        );
    }

    const { main, weather, wind, clouds, visibility, name } = data;
    const currentWeather = weather[0];
    const iconUrl = `http://openweathermap.org/img/wn/${currentWeather.icon}@2x.png`; // Icon lớn hơn

    // Dynamic gradient dựa trên weather.main (khớp screenshot: Clouds → xám-xanh)
    const getGradientColors = (mainType: string): string[] => {
        switch (mainType.toLowerCase()) {
            case 'clear': return ['#ff7a59', '#FEB47B', '#c7c703'];
            case 'clouds': return ['#918C7F', '#676D92', '#063E80'];
            case 'rain': return ['#4A90E2', '#50C9C3', '#A8E6CF'];
            case 'thunderstorm': return ['#2C3E50', '#34495E', '#7F8C8D'];
            default: return ['#918C7F', '#676D92', '#063E80'];
        }
    };
    const gradientColors = getGradientColors(currentWeather.main);

    const displayCity = getDisplayCityName(name)

    return (
        <LinearGradient colors={gradientColors} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header: Vị trí */}
                <View style={styles.locationHeader}>
                    <Text style={styles.cityText}>{displayCity}, Việt Nam</Text>
                    <Text style={styles.dateText}>
                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </Text>
                </View>

                {/* Main Weather */}
                <View style={styles.mainWeather}>
                    <Image source={{ uri: iconUrl }} style={styles.weatherIcon} />
                    <Text style={styles.temperature}>{Math.round(main.temp)}°</Text>
                    <Text style={styles.description}>{translateAndTitleCase(currentWeather.description)}</Text>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsContainer}>
                    <DetailItem
                        icon="water-outline"
                        label="Độ ẩm"
                        value={`${main.humidity}%`}
                        description={`${clouds.all}% mây che phủ`}
                    />
                    <DetailItem
                        icon="speedometer-outline"
                        label="Gió"
                        value={`${wind.speed} m/s`}
                        description={`${wind.deg}°`}
                    />
                    <DetailItem
                        icon="eye-outline"
                        label="Tầm nhìn"
                        value={`${visibility / 1000} km`}
                    />
                    <DetailItem
                        icon="bar-chart-outline"
                        label="Áp suất"
                        value={`${main.pressure} hPa`}
                    />
                    <DetailItem
                        icon="thermometer-outline"
                        label="Min/Max"
                        value={`${Math.round(main.temp_min)}° / ${Math.round(main.temp_max)}°`}
                    />
                </View>
            </ScrollView>
            <Button title="Clear Cache & Reload" onPress={async () => {
                await AsyncStorage.removeItem(CACHE_KEY_LOCATION);
                await AsyncStorage.removeItem(CACHE_KEY_WEATHER);
                Alert.alert('Cache cleared!', 'Reload screen để test GPS mới.');
                // Force reload: setLocation(null); fetchWeather(null);
            }} />
        </LinearGradient>
    );
};

// Type này thường được export từ thư viện
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Sub-component cho detail items
const DetailItem: React.FC<{
    icon: IoniconsName;
    label: string;
    value: string;
    description?: string;
}> = ({ icon, label, value, description }) => (
    <View style={styles.detailItem}>
        <Ionicons name={icon} size={24} color="#fff" />
        <View style={styles.detailText}>
            <Text style={styles.detailLabel}>{label}</Text>
            {description && <Text style={styles.detailDesc}>{description}</Text>}
        </View>
        <Text style={styles.detailValue}>{value}</Text>
    </View>
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
        backgroundColor: '#4facfe',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
        textAlign: 'center',
    },
    locationHeader: {
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 10,
    },
    cityText: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 1,
    },
    dateText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 5,
    },
    mainWeather: {
        alignItems: 'center',
        marginBottom: 40,
    },
    weatherIcon: {
        width: 120,
        height: 120,
        marginBottom: 10,
    },
    temperature: {
        fontSize: 90,
        fontWeight: '300',
        color: '#fff',
        letterSpacing: -2,
        marginTop: -15
    },
    description: {
        fontSize: 24,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
    },

    detailsContainer: {
        flex: 1,
        marginTop: 10
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        backdropFilter: 'blur(5px)',
    },
    detailText: {
        flex: 1,
        marginLeft: 15,
    },
    detailLabel: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    detailDesc: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    detailValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
    },
});

export default WeatherScreen;