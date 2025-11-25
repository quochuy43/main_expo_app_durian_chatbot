export type Sender = "user" | "bot" | "error";

export interface Message {
    id: string;
    sender: Sender;
    text: string;
    image?: string;
    isPending?: boolean;
}

export interface PendingImage {
    uri: string;
    file: {
        uri: string;
        name: string;
        type: string;
    };
}
// Nó quy định dữ liệu trong App của bạn trông như thế nào


// Đây là Union Type (Kiểu kết hợp). Biến nào có kiểu Sender thì nó phải là một trong ba giá trị "user", "bot", hoặc "error".

// Ý nghĩa: Định nghĩa cấu trúc của một "cục tin nhắn" hiển thị trên màn hình.
// isPending?: Dùng để hiển thị trạng thái loading (ví dụ: xoay vòng vòng khi ảnh đang upload).

// Ý nghĩa: Định nghĩa cấu trúc dữ liệu ảnh khi người dùng vừa chọn xong nhưng chưa gửi.
// uri (bên ngoài): Dùng để hiển thị cái ảnh xem trước (preview) trên màn hình điện thoại.
