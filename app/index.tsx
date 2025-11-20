import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, ImageBackground, Keyboard, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";


import ChatInput from "@/components/ChatInput";
import MessageComponent from "@/components/MessageComponent";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/Sidebar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

import { useThemeColor } from "@/hooks/use-theme-color";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useChatLogic } from "@/hooks/useChatLogic";

export default function HomeScreen() {
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
        <Sidebar isOpen={isSidebarOpen} onClose={() => toggleSidebar(false)} offset={sidebarOffset} />

        <Animated.View style={[{ flex: 1 }, mainAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 0} style={styles.flex1}>

              {/* Header */}
              <ThemedView style={styles.header}>
                <TouchableOpacity onPress={() => toggleSidebar(true)}>
                  <Ionicons name="menu" size={28} color={iconColor} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Durian Assistant</ThemedText>
              </ThemedView>

              {/* Chat Body */}
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
                  // --- CÁC DÒNG THÊM ĐỂ TỐI ƯU ---
                  removeClippedSubviews={true} // Cực quan trọng: Ẩn các item đã cuộn khỏi màn hình để giải phóng RAM (Android cực cần)
                  initialNumToRender={10}      // Chỉ render 10 tin nhắn đầu tiên khi mới mở
                  maxToRenderPerBatch={5}      // Render thêm 5 tin mỗi khi cuộn
                  windowSize={10}              // Giảm vùng nhớ đệm (mặc định là 21, giảm xuống 10 cho nhẹ)
                  updateCellsBatchingPeriod={50} // Thời gian chờ giữa các lần render batch
                />
              </View>

              {/* Chat Input */}
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
              />
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
});