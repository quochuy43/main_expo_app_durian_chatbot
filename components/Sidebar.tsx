import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, ImageBackground, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const { width } = Dimensions.get('window');
export const SIDEBAR_WIDTH = width * 0.7;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  offset: SharedValue<number>;
}

export default function Sidebar({ isOpen, onClose, offset }: SidebarProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    offset.value = withTiming(isOpen ? SIDEBAR_WIDTH : 0, { duration: 300 });
  }, [isOpen]);

  const panGesture = Gesture.Pan().onUpdate((event) => {
    if (event.translationX < -50) runOnJS(onClose)();
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value - SIDEBAR_WIDTH }],
  }));

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  const handleWeatherPress = () => {
    router.push('/weather');  // Navigate đến weather screen
    onClose(); // Đóng sidebar sau khi navigate
  };

  const handleHumidityPress = () => {
    router.push('/humility');
    onClose();
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          animatedStyle,
          { backgroundColor, borderRightColor: borderColor },
        ]}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <ThemedView style={styles.header}>
            <Ionicons name="person-circle-outline" size={36} color={textColor} />
            <ThemedText style={styles.userName}>
              {user?.full_name || 'Durian Consultant'}
            </ThemedText>
          </ThemedView>

          <ImageBackground
            source={require('@/assets/images/durian.png')}
            resizeMode="contain"
            style={styles.imageBackground}
            imageStyle={{ opacity: 0.15, position: 'absolute', right: -50, top: 100, width: 300, height: 300 }}
          >
            <ScrollView style={styles.chatSamples}>
              <SectionTitle title="Cuộc trò chuyện mẫu" />
              <ChatSample text="Tác dụng của sầu riêng với sức khỏe 🍈" index={0} isOpen={isOpen} />
              <ChatSample text="Sầu riêng nên bảo quản như thế nào?" index={1} isOpen={isOpen} />
              <ChatSample text="Mẹo chọn sầu riêng ngon?" index={2} isOpen={isOpen} />
              <ChatSample text="Phân biệt sầu riêng Ri6 và Monthong" index={3} isOpen={isOpen} />
            </ScrollView>
          </ImageBackground>

          {/* Menu dưới */}
          <ThemedView style={styles.footer}>
            <MenuItem icon="partly-sunny-outline" label="Thời tiết" onPress={handleWeatherPress} />
            {/* <MenuItem icon="settings-outline" label="Cài đặt" /> */}
            <MenuItem icon="water-outline" label="Độ ẩm" onPress={handleHumidityPress} />
            <MenuItem icon="log-out-outline" label="Đăng xuất" onPress={handleLogout} />
          </ThemedView>
        </SafeAreaView>
      </Animated.View>
    </GestureDetector>
  );
}


function SectionTitle({ title }: { title: string }) {
  const color = useThemeColor({}, 'text');
  return <ThemedText style={[styles.sectionTitle, { color }]}>{title}</ThemedText>;
}

function ChatSample({ text, index, isOpen }: { text: string; index: number; isOpen: boolean }) {
  const color = useThemeColor({}, 'text');
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    if (isOpen) {
      opacity.value = withDelay(index * 120, withTiming(1, { duration: 400 }));
      translateX.value = withDelay(index * 120, withTiming(0, { duration: 400 }));
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateX.value = withTiming(-20, { duration: 200 });
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[{ opacity: 0, transform: [{ translateX: -20 }] }, animatedStyle]}>
      <TouchableOpacity style={styles.chatSampleButton}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={color} />
        <ThemedText style={styles.chatSampleText}>{text}</ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: any; label: string; onPress?: () => void }) {
  const color = useThemeColor({}, 'text');
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={color} />
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
    </TouchableOpacity>
  );
}


// --- Styles ---
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    zIndex: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,200,200,0.2)',
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 10,
    marginLeft: 20,
    marginTop: 8,
  },
  chatSamples: {
    flex: 1,
    marginTop: 8,
  },
  imageBackground: {
    flex: 1,
  },
  chatSampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  chatSampleText: {
    marginLeft: 12,
    fontSize: 15,
    flexShrink: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,200,200,0.2)',
    paddingTop: 10,
    paddingBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuLabel: {
    fontSize: 16,
    marginLeft: 14,
    fontWeight: '500',
  },
});
