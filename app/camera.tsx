import { useTourGuide } from "@/contexts/TourGuideContext";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Tooltip from "react-native-walkthrough-tooltip";

const { width, height } = Dimensions.get("window");

export default function CameraScreen() {
    const router = useRouter();
    const cameraRef = useRef<CameraView>(null);
    const [facing, setFacing] = useState<CameraType>("back");
    const [permission, requestPermission] = useCameraPermissions();
    const [isCapturing, setIsCapturing] = useState(false);

    // Tour Guide
    const { shouldShowTour, currentTourScreen, setCurrentTourScreen } = useTourGuide();
    const [tourStep, setTourStep] = useState(0);
    const showTour = shouldShowTour && currentTourScreen === 'camera';

    // Start tour when screen is ready
    useEffect(() => {
        if (showTour && permission?.granted) {
            setTourStep(1);
        }
    }, [showTour, permission?.granted]);

    const handleNextTourStep = () => {
        if (tourStep < 3) {
            setTourStep(tourStep + 1);
        } else {
            // Tour camera hoàn thành, chuyển sang chat
            setTourStep(0);
            setCurrentTourScreen('chat');
        }
    };

    const handlePrevTourStep = () => {
        if (tourStep > 1) {
            setTourStep(tourStep - 1);
        }
    };

    const handleEndTour = () => {
        setTourStep(0);
        setCurrentTourScreen(null);
    };

    // Handle camera permission
    if (!permission) {
        return (
            <View style={styles.permissionContainer}>
                <ActivityIndicator size="large" color="#27ae60" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color="#666" />
                <Text style={styles.permissionTitle}>Cần quyền Camera</Text>
                <Text style={styles.permissionText}>
                    Cho phép ứng dụng truy cập camera để chụp ảnh sầu riêng
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Cho phép Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.skipButton} onPress={() => router.replace("/")}>
                    <Text style={styles.skipButtonText}>Bỏ qua</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Toggle front/back camera
    const toggleCameraFacing = () => {
        setFacing((current) => (current === "back" ? "front" : "back"));
    };

    // Take photo
    const takePhoto = async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
            });

            if (photo?.uri) {
                router.replace({
                    pathname: "/",
                    params: {
                        imageUri: photo.uri,
                        imageName: `photo_${Date.now()}.jpg`,
                        imageType: "image/jpeg",
                    },
                });
            }
        } catch (error) {
            console.error("Error taking photo:", error);
        } finally {
            setIsCapturing(false);
        }
    };

    // Pick from gallery
    const pickFromGallery = async () => {
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
            router.replace({
                pathname: "/",
                params: {
                    imageUri: asset.uri,
                    imageName: asset.fileName || "photo.jpg",
                    imageType: asset.mimeType || "image/jpeg",
                },
            });
        }
    };

    // Skip to chat
    const skipToChat = () => {
        router.replace("/");
    };

    return (
        <View style={styles.container}>
            {/* Camera View */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
            >
                {/* Top Bar */}
                <SafeAreaView style={styles.topBar} edges={["top"]}>
                    <TouchableOpacity style={styles.topButton} onPress={skipToChat}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Chụp ảnh sầu riêng</Text>
                    <TouchableOpacity style={styles.topButton} onPress={toggleCameraFacing}>
                        <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
                    </TouchableOpacity>
                </SafeAreaView>

                {/* Bottom Controls */}
                <SafeAreaView style={styles.bottomBar} edges={["bottom"]}>
                    {/* Gallery Button with Tooltip */}
                    <Tooltip
                        isVisible={tourStep === 2}
                        content={
                            <View style={styles.tooltipContent}>
                                <Text style={styles.tourStepIndicator}>Bước 2/3</Text>
                                <Text style={styles.tooltipText}>
                                    📁 Chọn ảnh từ thư viện của bạn
                                </Text>
                                <View style={styles.tourNavButtons}>
                                    <TouchableOpacity style={styles.tourPrevButton} onPress={handlePrevTourStep}>
                                        <Text style={styles.tourPrevButtonText}>← Quay lại</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.tourEndButton} onPress={handleEndTour}>
                                        <Text style={styles.tourEndButtonText}>Kết thúc</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.tooltipButton} onPress={handleNextTourStep}>
                                        <Text style={styles.tooltipButtonText}>Tiếp theo →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                        placement="top"
                        onClose={() => { }}
                        backgroundColor="rgba(0,0,0,0.7)"
                        contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
                    >
                        <TouchableOpacity style={styles.sideButton} onPress={pickFromGallery}>
                            <Ionicons name="images" size={30} color="#fff" />
                            <Text style={styles.sideButtonText}>Thư viện</Text>
                        </TouchableOpacity>
                    </Tooltip>

                    {/* Capture Button with Tooltip */}
                    <Tooltip
                        isVisible={tourStep === 1}
                        content={
                            <View style={styles.tooltipContent}>
                                <Text style={styles.tourStepIndicator}>Bước 1/3</Text>
                                <Text style={styles.tooltipText}>
                                    📸 Nhấn vào đây để chụp ảnh sầu riêng của bạn
                                </Text>
                                <View style={styles.tourNavButtons}>
                                    <TouchableOpacity style={styles.tourEndButton} onPress={handleEndTour}>
                                        <Text style={styles.tourEndButtonText}>Kết thúc</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.tooltipButton} onPress={handleNextTourStep}>
                                        <Text style={styles.tooltipButtonText}>Tiếp theo →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                        placement="top"
                        onClose={() => { }}
                        backgroundColor="rgba(0,0,0,0.7)"
                        contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
                    >
                        <TouchableOpacity
                            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                            onPress={takePhoto}
                            disabled={isCapturing}
                        >
                            {isCapturing ? (
                                <ActivityIndicator size="small" color="#27ae60" />
                            ) : (
                                <View style={styles.captureInner} />
                            )}
                        </TouchableOpacity>
                    </Tooltip>

                    {/* Skip Button with Tooltip */}
                    <Tooltip
                        isVisible={tourStep === 3}
                        content={
                            <View style={styles.tooltipContent}>
                                <Text style={styles.tourStepIndicator}>Bước 3/3</Text>
                                <Text style={styles.tooltipText}>
                                    💬 Hoặc bỏ qua chụp ảnh để trò chuyện trực tiếp với chuyên gia sầu riêng AI
                                </Text>
                                <View style={styles.tourNavButtons}>
                                    <TouchableOpacity style={styles.tourPrevButton} onPress={handlePrevTourStep}>
                                        <Text style={styles.tourPrevButtonText}>← Quay lại</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.tourEndButton} onPress={handleEndTour}>
                                        <Text style={styles.tourEndButtonText}>Kết thúc</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.tooltipButton} onPress={handleNextTourStep}>
                                        <Text style={styles.tooltipButtonText}>Tiếp theo →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        }
                        placement="top"
                        onClose={() => { }}
                        backgroundColor="rgba(0,0,0,0.7)"
                        contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
                    >
                        <TouchableOpacity style={styles.sideButton} onPress={skipToChat}>
                            <Ionicons name="chatbubbles" size={30} color="#fff" />
                            <Text style={styles.sideButtonText}>Bỏ qua</Text>
                        </TouchableOpacity>
                    </Tooltip>
                </SafeAreaView>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    camera: {
        flex: 1,
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: "#1a1a1a",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
        marginTop: 20,
        marginBottom: 12,
    },
    permissionText: {
        fontSize: 16,
        color: "#999",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    permissionButton: {
        backgroundColor: "#27ae60",
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    permissionButtonText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
    },
    skipButton: {
        paddingVertical: 12,
    },
    skipButtonText: {
        color: "#666",
        fontSize: 16,
    },
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "rgba(0,0,0,0.3)",
    },
    topButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#fff",
    },
    bottomBar: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 24,
        paddingHorizontal: 20,
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sideButton: {
        alignItems: "center",
        justifyContent: "center",
        width: 70,
    },
    sideButtonText: {
        color: "#fff",
        fontSize: 12,
        marginTop: 6,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 4,
        borderColor: "rgba(255,255,255,0.5)",
    },
    captureButtonDisabled: {
        opacity: 0.5,
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#fff",
        borderWidth: 3,
        borderColor: "#27ae60",
    },
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
});
