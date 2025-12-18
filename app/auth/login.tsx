import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState('');

    const { login, isLoading, error } = useAuth();
    const tintColor = useThemeColor({}, 'tint');
    const textColor = useThemeColor({}, 'text');
    const backgroundColor = useThemeColor({}, 'background');

    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleLogin = async () => {
        setLocalError('');

        // Validation
        if (!email.trim() || !password.trim()) {
            setLocalError('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (!validateEmail(email)) {
            setLocalError('Vui lòng nhập địa chỉ email hợp lệ');
            return;
        }

        try {
            await login(email, password);
            // Navigation will happen automatically via _layout.tsx when auth state changes
        } catch (err) {
            // Error is already set in context
            console.error('Login error:', err);
        }
    };

    const displayError = localError || error;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex1}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo/Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('@/assets/images/durian.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <ThemedText style={styles.title}>Durian Consultant</ThemedText>
                        <ThemedText style={styles.subtitle}>Đăng nhập để tiếp tục</ThemedText>
                    </View>

                    {/* Login Form */}
                    <View style={styles.form}>
                        {/* Error Message */}
                        {displayError && (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                                <ThemedText style={styles.errorText}>{displayError}</ThemedText>
                            </View>
                        )}

                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <ThemedText style={styles.label}>Email</ThemedText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Nhập email của bạn"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <ThemedText style={styles.label}>Mật khẩu</ThemedText>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: textColor }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Nhập mật khẩu"
                                    placeholderTextColor="#9ca3af"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoComplete="password"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.eyeIcon}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                        size={20}
                                        color="#9ca3af"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginButton, { backgroundColor: tintColor }, isLoading && styles.disabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <ThemedText style={styles.loginButtonText}>Đăng nhập</ThemedText>
                            )}
                        </TouchableOpacity>

                        {/* Register Link */}
                        <View style={styles.registerContainer}>
                            <ThemedText style={styles.registerText}>Chưa có tài khoản? </ThemedText>
                            <Link href="/auth/register" asChild>
                                <TouchableOpacity disabled={isLoading}>
                                    <ThemedText style={[styles.registerLink, { color: tintColor }]}>
                                        Đăng ký
                                    </ThemedText>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    form: {
        width: '100%',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fee2e2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 12,
        backgroundColor: '#f9fafb',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 14,
    },
    eyeIcon: {
        padding: 4,
    },
    loginButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        fontSize: 14,
        color: '#6b7280',
    },
    registerLink: {
        fontSize: 14,
        fontWeight: '600',
    },
});
