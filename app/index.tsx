import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  ImageBackground,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import MessageComponent from "@/components/MessageComponent";
import ChatInput from "@/components/ChatInput";
import Sidebar, { SIDEBAR_WIDTH } from "@/components/Sidebar";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

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

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };

  // Giữ lại useEffect này để cuộn xuống khi tin nhắn mới được thêm vào hoàn toàn
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Quyền truy cập", "Cần quyền truy cập gallery để chọn ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      // expo-image-picker 15 (đi kèm Expo SDK 54) vẫn dùng enum MediaTypeOptions,
      // nhưng khi chạy trong một số môi trường (ví dụ Expo Go mới) native module
      // lại kỳ vọng mảng string dạng 'images'. Ép kiểu any để tương thích runtime.
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


  const clearChat = () => {
    setMessages([
      {
        id: generateUniqueId(),
        sender: "bot",
        text: "Xin chào! Hãy gửi một tin nhắn để bắt đầu cuộc trò chuyện.",
      },
    ]);
    setPendingImage(null);
    setInputMessage("");
  };

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

    const botMsg: Message = {
      id: generateUniqueId(),
      sender: "bot",
      text: "Đang suy nghĩ...",
    };

    setMessages((prev) => [...prev, botMsg]);
    scrollToBottom();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const formData = new FormData();
      formData.append("user_id", "user111");
      formData.append("message", finalMessage);
      if (hasFile && imageFile) {
        formData.append("image", imageFile as any);
      }

      // const response = await fetch("https://90ad1b0dcf73.ngrok-free.app/chat/stream", {
        const response = await fetch("http://192.168.210.228:8000/chat/stream", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const fullText = await response.text();
      if (!fullText) {
        throw new Error("Empty response from backend");
      }

      const words = fullText.split(" ");
      let displayText = "";

      for (let i = 0; i < words.length; i++) {
        displayText += (i > 0 ? " " : "") + words[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsg.id ? { ...msg, text: displayText } : msg,
          ),
        );
        await delay(30);
      }

      scrollToBottom();

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
      scrollToBottom();
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
              behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                />
              </View>

              {/* Chat input */}
              <ChatInput
                message={inputMessage}
                setMessage={setInputMessage}
                sendMessage={sendMessage}
                pickImage={handleImageUpload}
                pickCamera={handleImageCapture}
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
    paddingBottom: 120,
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