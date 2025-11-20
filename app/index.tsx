import ChatInput from "@/components/ChatInput";
import MessageComponent from "@/components/MessageComponent";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/Sidebar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ImageBackground,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Sender = "user" | "bot" | "error";

interface Message {
  id: string;
  sender: Sender;
  text: string;
  image?: string;
  isPending?: boolean;
}

interface PendingImage {
  uri: string;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}

let messageIdCounter = 0;
const generateUniqueId = () => `${Date.now()}-${messageIdCounter++}`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function HomeScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateUniqueId(),
      sender: "bot",
      text: "Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [userInteractedDuringGeneration, setUserInteractedDuringGeneration] = useState(false);

  const background = useThemeColor({}, "background");
  const iconColor = useThemeColor({}, "text");

  const sidebarOffset = useSharedValue(0);
  const flatListRef = useRef<FlatList<Message>>(null);

  const toggleSidebar = (open: boolean) => {
    setIsSidebarOpen(open);
    sidebarOffset.value = withTiming(open ? SIDEBAR_WIDTH : 0, {
      duration: 250,
    });
  };

  const scrollToBottom = (animated: boolean = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    if (isScrolledToBottom && !userInteractedDuringGeneration) {
      scrollToBottom(false); 
    }
  }, [messages]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const atBottom = distanceFromBottom <= 50;

    setIsScrolledToBottom(atBottom);

    if (loading && !atBottom && !userInteractedDuringGeneration) {
      setUserInteractedDuringGeneration(true);
    }
  };

  // Xử lý speech to text

  // Thêm states vào HomeScreen component (sau các state hiện tại)
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  // Thêm state
  const [seconds, setSeconds] = useState(0);

  // Thêm useEffect
  useEffect(() => {
    let interval: any;
    if (recording) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(interval);
      setSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  async function startRecording() {
    try {
      console.log("Requesting permissions...");
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Quyền truy cập", "Cần quyền truy cập microphone để thu âm.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("Starting recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Lỗi", "Không thể bắt đầu thu âm.");
    }
  }

  async function stopRecording() {
    console.log("Stopping recording...");
    if (!recording) return;

    const rec = recording;
    setRecording(null);
    await rec.stopAndUnloadAsync();

    const uri = rec.getURI();
    if (uri) {
      await uploadAudio(uri);
    }
  }

  async function uploadAudio(uri: string) {
    setLoading(true);

    const fileName = uri.split("/").pop() ?? "audio.m4a";

    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: fileName,
      type: "audio/m4a",
    } as any);

    try {
      const response = await fetch("https://23ebb25ffdad.ngrok-free.app/asr", { // URL từ mock, cập nhật nếu cần
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ASR failed: ${response.statusText}`);
      }

      const data = await response.json();
      setInputMessage(data.text);

    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Lỗi", "Lỗi khi tải lên âm thanh!");
    }

    setLoading(false);
  }


  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Cần quyền truy cập gallery để chọn ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const imageUri = asset.uri;
      const file = {
        uri: imageUri,
        name: asset.fileName || "image.jpg",
        type: asset.mimeType || "image/jpeg",
      };

      setPendingImage({ uri: imageUri, file });

      const previewMsg: Message = {
        id: generateUniqueId(),
        sender: "user",
        text: inputMessage.trim(),
        image: imageUri,
        isPending: true,
      };

      setMessages((prev) => [
        ...prev.filter((msg) => !msg.isPending),
        previewMsg,
      ]);
    }
  };


  const handleImageCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Cần quyền truy cập Camera để chụp ảnh.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({

      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const imageUri = asset.uri;
      const file = {
        uri: imageUri,
        name: asset.fileName || "photo.jpg",
        type: asset.mimeType || "image/jpeg",
      };

      setPendingImage({ uri: imageUri, file });

      const previewMsg: Message = {
        id: generateUniqueId(),
        sender: "user",
        text: inputMessage.trim(),
        image: imageUri,
        isPending: true,
      };

      setMessages((prev) => [
        ...prev.filter((msg) => !msg.isPending),
        previewMsg,
      ]);
    }
  };


  // const clearChat = () => {
  //   setMessages([
  //     {
  //       id: generateUniqueId(),
  //       sender: "bot",
  //       text: "Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.",
  //     },
  //   ]);
  //   setPendingImage(null);
  //   setInputMessage("");
  // };

  const sendMessage = async (messageText?: string) => {
    if (loading) return;

    const message = messageText || inputMessage.trim();
    const hasFile = Boolean(pendingImage?.file);
    if (!message && !hasFile) return;

    const finalMessage = message || (hasFile ? "Hãy giới thiệu về" : "");
    const imageFile = pendingImage?.file;

    setMessages((prev) => {
      if (hasFile) {
        let pendingFound = false;
        const updated = prev.map((msg) => {
          if (msg.isPending) {
            pendingFound = true;
            return {
              ...msg,
              isPending: false,
              text: finalMessage,
            };
          }
          return msg;
        });

        if (pendingFound) {
          return updated;
        }

        return [
          ...updated,
          {
            id: generateUniqueId(),
            sender: "user",
            text: finalMessage,
            image: pendingImage?.uri,
          },
        ];
      }

      return [
        ...prev,
        {
          id: generateUniqueId(),
          sender: "user",
          text: finalMessage,
        },
      ];
    });

    setInputMessage("");
    setPendingImage(null);
    setLoading(true);
    setUserInteractedDuringGeneration(false); 

    const botMsg: Message = {
      id: generateUniqueId(),
      sender: "bot",
      text: "Đang suy nghĩ...",
    };

    setMessages((prev) => [...prev, botMsg]);
    scrollToBottom(false); 

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const formData = new FormData();
      formData.append("user_id", "user111");
      formData.append("message", finalMessage);
      if (hasFile && imageFile) {
        formData.append("image", imageFile as any);
      }

      const response = await fetch("https://23ebb25ffdad.ngrok-free.app/chat/stream", {
        // const response = await fetch("http://192.168.210.228:8000/chat/stream", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      let fullText = "";
      if (response.body) {
        // Thử streaming nếu có body
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let displayText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          displayText += chunk;

          // Cập nhật UI mỗi chunk
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsg.id ? { ...msg, text: displayText } : msg,
            ),
          );

          if (isScrolledToBottom && !userInteractedDuringGeneration) {
            scrollToBottom(false);
          }

          await delay(100);
        }

        fullText = displayText;
      } else {
        // Fallback nếu không có body stream: dùng response.text() và simulate batching
        fullText = await response.text();
        if (!fullText) {
          throw new Error("Empty response from backend");
        }

        const words = fullText.split(" ");
        let displayText = "";
        let batch = "";

        for (let i = 0; i < words.length; i++) {
          batch += (i > 0 ? " " : "") + words[i];
          if (i % 5 === 4 || i === words.length - 1) { // Batch mỗi 5 từ
            displayText += batch;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === botMsg.id ? { ...msg, text: displayText } : msg,
              ),
            );
            batch = "";
            await delay(150); // Độ trễ cho batch
            if (isScrolledToBottom && !userInteractedDuringGeneration) {
              scrollToBottom(false);
            }
          }
        }
      }

      // Hoàn tất
      if (isScrolledToBottom && !userInteractedDuringGeneration) {
        scrollToBottom(false);
      }

    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const withoutBot = prev.filter((msg) => msg.id !== botMsg.id);
        return [
          ...withoutBot,
          {
            id: generateUniqueId(),
            sender: "error",
            text: "❌ Lỗi khi gửi: " + (err?.message || "Unknown error"),
          },
        ];
      });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setUserInteractedDuringGeneration(false); // Reset after generation
      if (isScrolledToBottom) {
        scrollToBottom(false);
      }
    }
  };

  const mainAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarOffset.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: (sidebarOffset.value / SIDEBAR_WIDTH) * 0.3,
    display: sidebarOffset.value > 0 ? "flex" : "none",
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: background }}
        edges={["top", "left", "right", "bottom"]}
      >
        {/* Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => toggleSidebar(false)}
          offset={sidebarOffset}
        />

        {/* Main Content */}
        <Animated.View style={[{ flex: 1 }, mainAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              // Thay đổi 1: Sử dụng 'padding' cho iOS và undefined/height cho Android
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              // Thay đổi 2: Thêm offset (khoảng 90-100px để bù Header và Status bar)
              keyboardVerticalOffset={Platform.OS === "ios" ? 45 : 0}
              style={styles.keyboardAvoidView}
            >
              {/* Header */}
              <ThemedView style={styles.header}>
                <TouchableOpacity onPress={() => toggleSidebar(true)}>
                  <Ionicons name="menu" size={28} color={iconColor} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>
                  Hỏi Sầu Riêng Đi
                </ThemedText>
              </ThemedView>

              {/* Chat body */}
              <View style={styles.chatContainer}>
                <ImageBackground
                  source={require("@/assets/images/durian.png")}
                  resizeMode="contain"
                  style={styles.centerImageBackground}
                  imageStyle={styles.centerImageStyle}
                />

                <FlatList
                  ref={flatListRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <MessageComponent message={item} />
                  )}
                  contentContainerStyle={styles.messagesList}
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                  alwaysBounceVertical={true}
                  bounces={true}
                  keyboardDismissMode="on-drag"
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  initialNumToRender={10}
                  maxToRenderPerBatch={5}
                  windowSize={21}
                />
              </View>

              {/* Chat input */}
              <ChatInput
                message={inputMessage}
                setMessage={setInputMessage}
                sendMessage={() => sendMessage()}
                pickImage={handleImageUpload}
                pickCamera={handleImageCapture}
                startVoice={startRecording} // Thêm
                stopVoice={stopRecording} // Thêm
                isRecording={Boolean(recording)} // Thêm
                seconds={seconds}
                loading={loading}
                hasPendingImage={Boolean(pendingImage)}
              />
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>

        {/* Overlay khi mở Sidebar */}
        <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
          <TouchableWithoutFeedback onPress={() => toggleSidebar(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </Animated.View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidView: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  chatContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20, 
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,1)",
    zIndex: 150,
  },
  centerImageBackground: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -150 }, { translateY: -150 }],
    width: 300,
    height: 300,
    opacity: 0.2,
    zIndex: 0,
  },
  centerImageStyle: {
    width: "100%",
    height: "100%",
  },
});