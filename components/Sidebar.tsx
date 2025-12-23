import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, Dimensions, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  SharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Tooltip from 'react-native-walkthrough-tooltip';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const { width } = Dimensions.get('window');
export const SIDEBAR_WIDTH = Math.floor(width * 0.7);

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';
const TOUR_GUIDE_COMPLETED_KEY = 'tour_guide_completed';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  offset: SharedValue<number>;
  // Tour Props
  tourStep?: number;
  onNextTourStep?: () => void;
  onPrevTourStep?: () => void;
  onEndTour?: () => void;
}

export default function Sidebar({ isOpen, onClose, offset, tourStep = 0, onNextTourStep, onPrevTourStep, onEndTour }: SidebarProps) {
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
    router.push('/weather');
    onClose();
  };

  const handleSpeechPress = () => {
    router.push('/speech');
    onClose();
  };

  const handleTutorialPress = () => {
    Alert.alert(
      'Xem hướng dẫn sử dụng',
      'Bạn muốn xem lại hướng dẫn sử dụng ứng dụng?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xem hướng dẫn',
          onPress: async () => {
            await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
            await AsyncStorage.removeItem(TOUR_GUIDE_COMPLETED_KEY);
            onClose();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  // Helper for Tooltip Content
  const renderTooltipContent = (step: string, text: string, isLastStepInSidebar = false) => (
    <View style={styles.tooltipContent}>
      <Text style={styles.tourStepIndicator}>{step}</Text>
      <Text style={styles.tooltipText}>{text}</Text>
      <View style={styles.tourNavButtons}>
        {onPrevTourStep && (
          <TouchableOpacity style={styles.tourPrevButton} onPress={onPrevTourStep}>
            <Text style={styles.tourPrevButtonText}>← Quay lại</Text>
          </TouchableOpacity>
        )}
        {onEndTour && (
          <TouchableOpacity style={styles.tourEndButton} onPress={onEndTour}>
            <Text style={styles.tourEndButtonText}>Kết thúc</Text>
          </TouchableOpacity>
        )}
        {onNextTourStep && (
          <TouchableOpacity style={styles.tooltipButton} onPress={onNextTourStep}>
            <Text style={styles.tooltipButtonText}>{isLastStepInSidebar ? "Ra Chat →" : "Tiếp theo →"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );


  const isWeatherTour = tourStep === 4;
  const isSettingsTour = tourStep === 5;
  const isLogoutTour = tourStep === 6;

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
            {/* Tour Step 2: Account Info */}
            <Tooltip
              isVisible={tourStep === 2}
              content={renderTooltipContent('Bước 2/10', '👤 Thông tin tài khoản của bạn hiển thị tại đây.')}
              placement="bottom"
              onClose={() => { }}
              backgroundColor="rgba(0,0,0,0.7)"
              contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
              useInteractionManager={true}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor }}>
                <Ionicons name="person-circle-outline" size={36} color={textColor} />
                <ThemedText style={styles.userName}>
                  {user?.full_name || 'Durian Consultant'}
                </ThemedText>
              </View>
            </Tooltip>
          </ThemedView>

          <ImageBackground
            source={require('@/assets/images/durian.png')}
            resizeMode="contain"
            style={styles.imageBackground}
            imageStyle={{ opacity: 0.15, position: 'absolute', right: -50, top: 100, width: 300, height: 300 }}
          >
            <ScrollView style={styles.chatSamples}>
              <SectionTitle title="Cuộc trò chuyện mẫu" />

              {/* Tour Step 3: Chat Samples */}
              <Tooltip
                isVisible={tourStep === 3}
                content={renderTooltipContent('Bước 3/10', '💡 Các cuộc trò chuyện của bạn sẽ được lưu trữ ở đây, bạn có thể tìm lại chúng dễ dàng.')}
                placement="bottom"
                onClose={() => { }}
                backgroundColor="rgba(0,0,0,0.7)"
                contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
                useInteractionManager={true}
              >
                <View style={{ backgroundColor }}>
                  <ChatSample text="Tác dụng của sầu riêng với sức khỏe 🍈" index={0} isOpen={isOpen} />
                  <ChatSample text="Sầu riêng nên bảo quản như thế nào?" index={1} isOpen={isOpen} />
                  <ChatSample text="Mẹo chọn sầu riêng ngon?" index={2} isOpen={isOpen} />
                  <ChatSample text="Phân biệt sầu riêng Ri6 và Monthong" index={3} isOpen={isOpen} />
                </View>
              </Tooltip>
            </ScrollView>
          </ImageBackground>


          {/* Menu dưới */}
          <ThemedView style={styles.footer}>
            {/* Tour Step 4: Weather */}
            <Tooltip
              isVisible={isWeatherTour}
              content={renderTooltipContent('Bước 4/10', '☀️ Xem dự báo thời tiết chuyên sâu cho khu vực trồng sầu riêng của bạn.')}
              placement="top"
              onClose={() => { }}
              backgroundColor="rgba(0,0,0,0.7)"
              contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
              useInteractionManager={true}
            >
              <View style={{ backgroundColor, width: '100%' }}>
                <MenuItem icon="partly-sunny-outline" label="Thời tiết" onPress={handleWeatherPress} />
              </View>
            </Tooltip>

            <MenuItem icon="book-outline" label="Hướng dẫn sử dụng" onPress={handleTutorialPress} />

            {/* Tour Step 5: Settings */}
            <Tooltip
              isVisible={isSettingsTour}
              content={renderTooltipContent('Bước 5/10', '⚙️ Cài đặt các tùy chỉnh ở đây.', false)}
              placement="top"
              onClose={() => { }}
              backgroundColor="rgba(0,0,0,0.7)"
              contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
              useInteractionManager={true}
            >
              <View style={{ backgroundColor, width: '100%' }}>
                <MenuItem icon="settings-outline" label="Cài đặt" onPress={handleSpeechPress} />
              </View>
            </Tooltip>

            {/* Tour Step 6: Logout */}
            <Tooltip
              isVisible={isLogoutTour}
              content={renderTooltipContent('Bước 6/10', '🚪 Đăng xuất khỏi tài khoản của bạn.', true)}
              placement="top"
              onClose={() => { }}
              backgroundColor="rgba(0,0,0,0.7)"
              contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
              useInteractionManager={true}
            >
              <View style={{ backgroundColor, width: '100%' }}>
                <MenuItem icon="log-out-outline" label="Đăng xuất" onPress={handleLogout} />
              </View>
            </Tooltip>
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
  const opacity = useSharedValue(isOpen ? 1 : 0);
  const translateX = useSharedValue(isOpen ? 0 : -20);

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

function MenuItem({ icon, label, onPress, style }: { icon: any; label: string; onPress?: () => void; style?: any }) {
  const color = useThemeColor({}, 'text');
  return (
    <TouchableOpacity style={[styles.menuItem, style]} onPress={onPress}>
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
  // Tour Guide Styles
  tooltipContent: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
  },
  tooltipText: {
    color: '#333',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  tooltipButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tooltipButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tourStepIndicator: {
    color: '#1a8f4a',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  tourNavButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tourPrevButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourPrevButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  tourEndButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourEndButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
