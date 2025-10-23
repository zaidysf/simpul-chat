export interface Chatroom {
  id: number;
  name: string;
}

export type ChatroomEvent =
  | { event: "chatroom.created"; data: Chatroom }
  | { event: "chatroom.deleted"; data: { id: number; name: string } };

export interface ChatMessage {
  id: number;
  chatroomId: number;
  content: string;
  senderName: string;
  createdAt: string;
}

export interface RealtimeMessageEvent {
  event: string;
  data: {
    id: number;
    chatroom_id: number;
    content: string;
    sender_name: string;
    created_at: string;
  };
}
