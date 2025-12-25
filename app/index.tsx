import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, ImageBackground, Keyboard, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Tooltip from "react-native-walkthrough-tooltip";


import ChatInput from "@/components/ChatInput";
import MessageComponent from "@/components/MessageComponent";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/Sidebar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useTourGuide } from "@/contexts/TourGuideContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChatLogic } from "@/hooks/useChatLogic";

export default function HomeScreen() {
  // Get route params (image from camera page)
  const params = useLocalSearchParams<{
    imageUri?: string;
    imageName?: string;
    imageType?: string;
  }>();

  // Theme & Styles
  const background = useThemeColor({}, "background");
  const iconColor = useThemeColor({}, "text");

  // Sidebar Logic
  const sidebarOffset = useSharedValue(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = (open: boolean) => {
    setIsSidebarOpen(open);
    sidebarOffset.value = withTiming(open ? SIDEBAR_WIDTH : 0, { duration: 250 });
  };

  // Business Logic Hooks
  const chat = useChatLogic();
  const audio = useAudioRecorder((text) => chat.setInputMessage(text));

  // Tour Guide
  const { shouldShowTour, currentTourScreen, completeTour } = useTourGuide();
  const [tourStep, setTourStep] = useState(0);
  const showTour = shouldShowTour && currentTourScreen === 'chat';

  // Start tour when navigating from camera
  useEffect(() => {
    if (showTour) {
      setTourStep(1);
    }
  }, [showTour]);

  // Handle auto-open/close Sidebar during tour
  useEffect(() => {
    if (showTour) {
      if (tourStep >= 2 && tourStep <= 7) {
        // Open Sidebar for Steps 2 to 7 (Account -> Logout)
        if (!isSidebarOpen) toggleSidebar(true);
      } else if (tourStep >= 8) {
        // Close Sidebar when moving to Step 8 (Chat Body)
        if (isSidebarOpen) toggleSidebar(false);
      }
    }
  }, [tourStep, showTour]);

  const handleNextTourStep = () => {
    // Total 11 steps
    if (tourStep < 11) {
      setTourStep(tourStep + 1);
    } else {
      // Tour hoàn thành
      setTourStep(0);
      completeTour();
    }
  };

  const handlePrevTourStep = () => {
    if (tourStep > 1) {
      setTourStep(tourStep - 1);
    }
  };

  const handleEndTour = () => {
    setTourStep(0);
    // Ensure sidebar closes if ending tour early
    if (isSidebarOpen) toggleSidebar(false);
    completeTour();
  };

  // Handle image from camera page
  useEffect(() => {
    if (params.imageUri && params.imageName && params.imageType) {
      chat.setExternalImage(params.imageUri, params.imageName, params.imageType);
    }
  }, [params.imageUri, params.imageName, params.imageType]);

  // Scroll handling UI specific
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const atBottom = contentSize.height - contentOffset.y - layoutMeasurement.height <= 50;
    chat.setIsScrolledToBottom(atBottom);
    if (chat.loading && !atBottom) chat.setUserInteracted(true);
  };

  // Animations
  const mainAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sidebarOffset.value }] }));
  const overlayAnimatedStyle = useAnimatedStyle(() => ({ opacity: (sidebarOffset.value / SIDEBAR_WIDTH) * 0.3, display: sidebarOffset.value > 0 ? "flex" : "none" }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: background }} edges={["top", "left", "right", "bottom"]}>
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => toggleSidebar(false)}
          offset={sidebarOffset}

          // Tour Props
          tourStep={tourStep}
          onNextTourStep={handleNextTourStep}
          onPrevTourStep={handlePrevTourStep}
          onEndTour={handleEndTour}
        />

        <Animated.View style={[{ flex: 1 }, mainAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 0} style={styles.flex1}>



              {/* Header */}
              <ThemedView style={styles.header}>
                {/* Tour Step 1: Menu Button - No Tooltip Wrapper */}
                <View style={{ backgroundColor: background, opacity: tourStep === 1 ? 0 : 1 }}>
                  <TouchableOpacity onPress={() => toggleSidebar(true)} style={{ padding: 4 }}>
                    <Ionicons name="menu" size={28} color={iconColor} />
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.headerTitle}>Durian Consultant</ThemedText>
              </ThemedView>

              {/* Chat Body - No Tooltip wrapper for large container */}
              <View style={styles.chatContainer}>

                <ImageBackground source={require("@/assets/images/durian.png")} resizeMode="contain" style={styles.bgImage} imageStyle={styles.bgImageStyle} />

                <FlatList
                  ref={chat.flatListRef}
                  data={chat.messages}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <MessageComponent message={item} />}
                  contentContainerStyle={styles.listContent}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  keyboardDismissMode="on-drag"
                  removeClippedSubviews={true}
                  initialNumToRender={10}
                  maxToRenderPerBatch={5}
                  windowSize={10}
                  updateCellsBatchingPeriod={50}
                />

                {/* Tour Step 8: Chat Screen */}
                {tourStep === 8 && (
                  <View style={styles.tourOverlay}>
                    <View style={styles.tourCard}>
                      <Text style={styles.tourStepIndicator}>Bước 8/11 - Trang Chat</Text>
                      <Text style={styles.tourCardText}>
                        💬 Đây là nơi hiển thị cuộc trò chuyện với AI chuyên gia sầu riêng.
                      </Text>
                      <View style={styles.tourNavButtons}>
                        <TouchableOpacity style={styles.tourPrevButton} onPress={handlePrevTourStep}>
                          <Text style={styles.tourPrevButtonText}>← Quay lại</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tourEndButton} onPress={handleEndTour}>
                          <Text style={styles.tourEndButtonText}>Kết thúc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tooltipButton} onPress={handleNextTourStep}>
                          <Text style={styles.tooltipButtonText}>Tiếp →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Chat Input */}
              <View>
                <ChatInput
                  message={chat.inputMessage}
                  setMessage={chat.setInputMessage}
                  onSend={() => chat.sendMessage()}
                  onPickImage={() => chat.pickMedia(false)}
                  onPickCamera={() => chat.pickMedia(true)}
                  audio={{
                    isRecording: Boolean(audio.recording),
                    seconds: audio.seconds,
                    start: audio.startRecording,
                    stop: audio.stopRecording
                  }}
                  loading={chat.loading || audio.isProcessing}
                  hasPendingImage={Boolean(chat.pendingImage)}

                  // Tour props
                  tourStep={tourStep}
                  onNextTourStep={handleNextTourStep}
                  onPrevTourStep={handlePrevTourStep}
                  onEndTour={handleEndTour}
                />

              </View>
              {/* Tour Step 1: Menu Overlay */}
              {tourStep === 1 && (
                <View style={styles.tourOverlay}>
                  {/* Spotlight: Highlighted Button Component */}
                  <View style={{
                    position: 'absolute',
                    top: 16,
                    left: 20,
                    backgroundColor: 'white',
                    borderRadius: 8,
                    padding: 4,
                    zIndex: 210,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5
                  }}>
                    <Ionicons name="menu" size={28} color="#333" />
                  </View>

                  {/* Tour Card */}
                  <View style={{ position: 'absolute', top: 75, left: 20, right: 20, alignItems: 'flex-start', zIndex: 210 }}>
                    <View style={styles.tooltipTriangle} />
                    <View style={[styles.tourCard, { marginHorizontal: 0, width: 280, alignItems: 'center' }]}>
                      <Text style={styles.tourStepIndicator}>Bước 1/11 - Menu</Text>
                      <Text style={styles.tourCardText}>
                        📂 Mở menu để xem thêm các tính năng như thời tiết, mẫu câu hỏi và cài đặt...
                      </Text>
                      <View style={styles.tourNavButtons}>
                        <TouchableOpacity style={styles.tourEndButton} onPress={handleEndTour}>
                          <Text style={styles.tourEndButtonText}>Kết thúc</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tooltipButton} onPress={handleNextTourStep}>
                          <Text style={styles.tooltipButtonText}>Tiếp →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={() => toggleSidebar(false)}><View style={styles.flex1} /></TouchableWithoutFeedback>
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: "#E5E5E5" },
  headerTitle: { fontSize: 20, fontWeight: "bold", flex: 1, textAlign: "center" },
  chatContainer: { flex: 1, justifyContent: "flex-start" },
  listContent: { padding: 16, paddingBottom: 20 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,1)", zIndex: 150 },
  bgImage: { position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -150 }, { translateY: -150 }], width: 300, height: 300, opacity: 0.2, zIndex: 0 },
  bgImageStyle: { width: "100%", height: "100%" },
  // Tour Guide Tooltip Styles
  tooltipContent: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  tooltipText: {
    color: "#333",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
  },
  tooltipButton: {
    backgroundColor: "#27ae60",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tooltipButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  // Tour Overlay Styles (for large containers)
  tourOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  tourCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  tourCardText: {
    color: "#333",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 24,
  },
  // Tour Navigation Styles
  tourStepIndicator: {
    color: "#1a8f4a",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  tourNavButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  tourPrevButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourPrevButtonText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "500",
  },
  tourEndButton: {
    backgroundColor: "#ff6b6b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tourEndButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  tooltipTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#ffffff",
    marginLeft: 20, // Align with the menu icon roughly
    marginBottom: -1,
    zIndex: 10,
  },
});
