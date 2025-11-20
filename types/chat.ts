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