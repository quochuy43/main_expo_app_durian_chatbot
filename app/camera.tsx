import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

interface CapturedImage {
    uri: string;
    file: {
        uri: string;
        name: string;
        type: string;
    };
}

export default function CameraScreen() {
    const router = useRouter();
    const background = useThemeColor({}, "background");
    const iconColor = useThemeColor({}, "text");
    const tintColor = useThemeColor({}, "tint");

    const [permission, requestPermission] = useCameraPermissions();
    const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
    const cameraRef = useRef<CameraView>(null);

    // Đổi camera trước/sau
    const toggleCameraFacing = () => {
        setCameraFacing(prev => prev === "back" ? "front" : "back");
    };

    // Xử lý chụp ảnh
    const takePicture = async () => {
        if (!cameraRef.current || !isCameraReady) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
            });

            if (photo) {
                setCapturedImage({
                    uri: photo.uri,
                    file: {
                        uri: photo.uri,
                        name: `photo_${Date.now()}.jpg`,
                        type: "image/jpeg",
                    },
                });
            }
        } catch (error) {
            console.error("Lỗi chụp ảnh:", error);
        }
    };

    // Xử lý chọn ảnh từ gallery
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"] as any,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setCapturedImage({
                uri: asset.uri,
                file: {
                    uri: asset.uri,
                    name: asset.fileName || `image_${Date.now()}.jpg`,
                    type: asset.mimeType || "image/jpeg",
                },
            });
        }
    };

    // Xử lý gửi ảnh đến chatbot
    const sendToChat = () => {
        if (!capturedImage) return;

        router.push({
            pathname: "/chatbot",
            params: {
                imageUri: capturedImage.uri,
                imageName: capturedImage.file.name,
                imageType: capturedImage.file.type,
            },
        });
    };

    // Hủy ảnh đã chụp
    const cancelImage = () => {
        setCapturedImage(null);
    };

    // Xin quyền camera
    if (!permission) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
                <ActivityIndicator size="large" color={tintColor} />
            </SafeAreaView>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
                <ThemedView style={styles.permissionContainer}>
                    <Ionicons name="camera-outline" size={64} color={iconColor} />
                    <ThemedText style={styles.permissionText}>
                        Cần quyền truy cập Camera để chụp ảnh sầu riêng
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.permissionButton, { backgroundColor: tintColor }]}
                        onPress={requestPermission}
                    >
                        <ThemedText style={styles.permissionButtonText}>
                            Cấp quyền Camera
                        </ThemedText>
                    </TouchableOpacity>
                </ThemedView>
            </SafeAreaView>
        );
    }

    // Hiển thị ảnh đã chụp/chọn
    if (capturedImage) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
                {/* Header */}
                <ThemedView style={styles.header}>
                    <TouchableOpacity onPress={cancelImage}>
                        <Ionicons name="close" size={28} color={iconColor} />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Xem trước ảnh</ThemedText>
                    <View style={{ width: 28 }} />
                </ThemedView>

                {/* Preview ảnh */}
                <View style={styles.previewContainer}>
                    <Image source={{ uri: capturedImage.uri }} style={styles.previewImage} />
                </View>

                {/* Action buttons */}
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionButton} onPress={cancelImage}>
                        <Ionicons name="refresh" size={28} color="#fff" />
                        <ThemedText style={styles.actionButtonText}>Chụp lại</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: tintColor }]}
                        onPress={sendToChat}
                    >
                        <Ionicons name="send" size={24} color="#fff" />
                        <ThemedText style={styles.sendButtonText}>Gửi đến Chat</ThemedText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Camera view
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: "#000" }]}>
            {/* Header */}
            <ThemedView style={[styles.header, { backgroundColor: "transparent" }]}>
                <View style={{ width: 28 }} />
                <ThemedText style={[styles.headerTitle, { color: "#fff" }]}>
                    Chụp ảnh Sầu Riêng
                </ThemedText>
                <TouchableOpacity onPress={() => router.push("/chatbot")}>
                    <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </ThemedView>

            {/* Camera */}
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={cameraFacing}
                    onCameraReady={() => setIsCameraReady(true)}
                />

                {/* Overlay frame */}
                <View style={styles.frameOverlay}>
                    <View style={styles.frameCorner} />
                </View>
            </View>

            {/* Camera controls */}
            <View style={styles.controlBar}>
                {/* Gallery button */}
                <TouchableOpacity style={styles.controlButton} onPress={pickImage}>
                    <Ionicons name="images-outline" size={28} color="#fff" />
                    <ThemedText style={styles.controlButtonText}>Thư viện</ThemedText>
                </TouchableOpacity>

                {/* Capture button */}
                <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                    <View style={styles.captureButtonInner} />
                </TouchableOpacity>

                {/* Flip camera button */}
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleCameraFacing}
                >
                    <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                    <ThemedText style={styles.controlButtonText}>Đổi cam</ThemedText>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        flex: 1,
        textAlign: "center",
    },
    permissionContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
        gap: 20,
    },
    permissionText: {
        fontSize: 16,
        textAlign: "center",
        opacity: 0.8,
    },
    permissionButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 10,
    },
    permissionButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
    cameraContainer: {
        flex: 1,
        position: "relative",
    },
    camera: {
        flex: 1,
    },
    frameOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    frameCorner: {
        width: 250,
        height: 250,
        borderWidth: 3,
        borderColor: "rgba(255, 255, 255, 0.6)",
        borderRadius: 20,
        backgroundColor: "transparent",
    },
    controlBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: "#000",
    },
    controlButton: {
        alignItems: "center",
        gap: 8,
        minWidth: 70,
    },
    controlButtonText: {
        color: "#fff",
        fontSize: 12,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "#fff",
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#fff",
    },
    previewContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    previewImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
        borderRadius: 12,
    },
    actionBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingVertical: 20,
        paddingHorizontal: 20,
        gap: 20,
    },
    actionButton: {
        alignItems: "center",
        gap: 8,
        padding: 16,
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        borderRadius: 12,
    },
    actionButtonText: {
        fontSize: 14,
    },
    sendButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 30,
    },
    sendButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
    },
});
