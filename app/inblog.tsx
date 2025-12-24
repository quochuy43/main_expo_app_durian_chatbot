import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    TextInput,
    ActivityIndicator,
    Alert,
    Keyboard,
    Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';

const API_URL_BLOG = `${API_URL}/blog`;
const { width } = Dimensions.get('window');

type Post = {
    id: string;
    author: string;
    author_avatar: string;
    content: string;
    image?: string;
    likes: number;
    comments: number;
    is_liked: boolean;
    tag: string;
    created_at: string;
};

export default function Blog() {
    const { token } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [content, setContent] = useState('');
    const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [loading, setLoading] = useState(true);
    const [posting, setPosting] = useState(false);

    /* ---------- FETCH POSTS ---------- */
    const fetchPosts = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${API_URL_BLOG}/posts?tag=Tất cả`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) throw new Error();
            setPosts(await res.json());
        } catch {
            Alert.alert('Lỗi', 'Không thể tải bài viết');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchPosts();
    }, [token]);

    /* ---------- PICK IMAGE ---------- */
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0]);
    };

    /* ---------- CREATE POST ---------- */
    const submitPost = async () => {
        if ((!content.trim() && !image) || !token) return;

        setPosting(true);
        Keyboard.dismiss();

        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('tag', 'Thảo luận');

            if (image) {
                formData.append('image', {
                    uri: image.uri,
                    name: 'photo.jpg',
                    type: 'image/jpeg',
                } as any);
            }

            const res = await fetch(`${API_URL_BLOG}/posts`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error();

            setContent('');
            setImage(null);
            fetchPosts();
        } catch {
            Alert.alert('Lỗi', 'Đăng bài thất bại');
        } finally {
            setPosting(false);
        }
    };

    /* ---------- LIKE ---------- */
    const toggleLike = async (postId: string) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, is_liked: !p.is_liked, likes: p.is_liked ? p.likes - 1 : p.likes + 1 }
                    : p
            )
        );

        await fetch(`${API_URL_BLOG}/posts/${postId}/like`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
    };

    /* ---------- FORMAT TIME ---------- */
    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Vừa xong';
        if (diffMins < 60) return `${diffMins} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    /* ---------- RENDER POST ---------- */
    const renderPost = ({ item }: { item: Post }) => (
        <View style={styles.postCard}>
            {/* Header */}
            <View style={styles.postHeader}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{item.author_avatar}</Text>
                </View>
                <View style={styles.postInfo}>
                    <Text style={styles.authorName}>{item.author}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
                        {item.tag && (
                            <>
                                <View style={styles.dot} />
                                <View style={styles.tagBadge}>
                                    <Ionicons name="pricetag" size={11} color="#10B981" />
                                    <Text style={styles.tagBadgeText}>{item.tag}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </View>

            {/* Content */}
            {item.content && <Text style={styles.postContent}>{item.content}</Text>}

            {/* Image */}
            {item.image && (
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
                </View>
            )}

            {/* Actions */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => toggleLike(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconCircle, item.is_liked && styles.iconCircleLiked]}>
                        <Ionicons
                            name={item.is_liked ? 'heart' : 'heart-outline'}
                            size={20}
                            color={item.is_liked ? '#FF6B6B' : '#64748B'}
                        />
                    </View>
                    <Text style={[styles.actionText, item.is_liked && styles.actionTextLiked]}>
                        {item.likes > 0 ? item.likes : 'Thích'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="chatbubble-outline" size={18} color="#64748B" />
                    </View>
                    <Text style={styles.actionText}>
                        {item.comments > 0 ? item.comments : 'Bình luận'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="share-social-outline" size={18} color="#64748B" />
                    </View>
                    <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#009e3d', '#ffffff']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 0.3 }}
            >
                {/* Posts List with Header */}
                <FlatList
                    data={posts}
                    renderItem={renderPost}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.postsList}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            {/* Create Post Section */}
                            <View style={styles.createSection}>
                                <View style={styles.createHeader}>
                                    <Ionicons name="create-outline" size={24} color="#10B981" />
                                    <Text style={styles.createTitle}>Tạo bài viết mới</Text>
                                </View>

                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        placeholder="Chia sẻ kinh nghiệm trồng sầu riêng của bạn..."
                                        placeholderTextColor="#94A3B8"
                                        value={content}
                                        onChangeText={setContent}
                                        style={styles.textInput}
                                        multiline
                                        maxLength={500}
                                    />
                                </View>

                                {image && (
                                    <View style={styles.imagePreviewContainer}>
                                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageBtn}
                                            onPress={() => setImage(null)}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="close" size={20} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.createActions}>
                                    <TouchableOpacity
                                        style={styles.imagePickerBtn}
                                        onPress={pickImage}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="images-outline" size={22} color="#10B981" />
                                        <Text style={styles.imagePickerText}>Thêm ảnh</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.postBtn,
                                            (!content.trim() && !image) && styles.postBtnDisabled
                                        ]}
                                        onPress={submitPost}
                                        disabled={posting || (!content.trim() && !image)}
                                        activeOpacity={0.8}
                                    >
                                        {posting ? (
                                            <ActivityIndicator color="white" size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.postBtnText}>Đăng bài</Text>
                                                <Ionicons name="arrow-forward" size={18} color="white" />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Section Divider */}
                            {posts.length > 0 && (
                                <View style={styles.sectionDivider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.dividerText}>Bài viết gần đây</Text>
                                    <View style={styles.dividerLine} />
                                </View>
                            )}
                        </>
                    }
                    ListEmptyComponent={
                        loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#10B981" />
                                <Text style={styles.loadingText}>Đang tải bài viết...</Text>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
                                </View>
                                <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
                                <Text style={styles.emptyText}>
                                    Hãy là người đầu tiên chia sẻ kinh nghiệm{'\n'}về trồng sầu riêng!
                                </Text>
                            </View>
                        )
                    }
                />
            </LinearGradient>
        </View>
    );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },

    gradient: {
        flex: 1,
    },

    postsList: {
        paddingBottom: 20,
    },

    /* CREATE SECTION */
    createSection: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 45,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    createHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    createTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 10,
        letterSpacing: -0.3,
    },
    inputWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 100,
        marginBottom: 12,
    },
    textInput: {
        fontSize: 15,
        color: '#1E293B',
        lineHeight: 22,
        maxHeight: 140,
    },
    imagePreviewContainer: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    imagePreview: {
        width: '100%',
        height: 220,
        backgroundColor: '#F1F5F9',
    },
    removeImageBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    createActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    imagePickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 18,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#BBF7D0',
    },
    imagePickerText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '600',
        color: '#10B981',
        letterSpacing: -0.2,
    },
    postBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 24,
        backgroundColor: '#10B981',
        borderRadius: 12,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
        minWidth: 120,
        justifyContent: 'center',
        gap: 6,
    },
    postBtnDisabled: {
        backgroundColor: '#CBD5E1',
        shadowOpacity: 0,
        elevation: 0,
    },
    postBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: 'white',
        letterSpacing: -0.2,
    },

    /* SECTION DIVIDER */
    sectionDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginHorizontal: 16,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },

    /* POST CARD */
    postCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },

    /* POST HEADER */
    postHeader: {
        flexDirection: 'row',
        marginBottom: 14,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#10B981',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: 'white',
    },
    postInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    authorName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        marginLeft: 2,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#CBD5E1',
        marginHorizontal: 4,
    },
    tagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    tagBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#10B981',
        letterSpacing: -0.1,
    },

    /* POST CONTENT */
    postContent: {
        fontSize: 15,
        lineHeight: 24,
        color: '#334155',
        marginBottom: 14,
        letterSpacing: -0.1,
    },
    imageWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 14,
        backgroundColor: '#F1F5F9',
    },
    postImage: {
        width: '100%',
        height: 260,
    },

    /* ACTION BAR */
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        gap: 8,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    iconCircleLiked: {
        backgroundColor: '#FEE2E2',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: -0.2,
    },
    actionTextLiked: {
        color: '#FF6B6B',
    },

    /* LOADING */
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
        color: '#64748B',
    },

    /* EMPTY STATE */
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
    },
});