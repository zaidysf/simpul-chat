import { config } from "./config";
import type { ChatMessage, Chatroom } from "@/types/chat";

interface ApiChatroom {
  id: number;
  name: string;
  messages?: ApiMessage[];
}

interface ApiMessage {
  id: number;
  chatroom_id: number;
  content: string;
  sender_name: string;
  created_at: string;
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      message = data?.error || data?.errors?.join(", ") || message;
    } catch {
      // ignore JSON parsing errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const deserializeMessage = (message: ApiMessage): ChatMessage => ({
  id: message.id,
  chatroomId: message.chatroom_id,
  content: message.content,
  senderName: message.sender_name,
  createdAt: message.created_at,
});

export const fetchChatrooms = async (): Promise<Chatroom[]> => {
  const response = await fetch(`${config.apiUrl}/api/chatrooms`);
  const data = (await handleResponse(response)) as ApiChatroom[];
  return data.map(({ id, name }) => ({ id, name }));
};

export const fetchMessages = async (
  chatroomId: number,
): Promise<ChatMessage[]> => {
  const response = await fetch(
    `${config.apiUrl}/api/chatrooms/${chatroomId}/messages`,
  );
  const data = (await handleResponse(response)) as ApiMessage[];
  return data.map(deserializeMessage);
};

export const createChatroom = async (name: string): Promise<Chatroom> => {
  const response = await fetch(`${config.apiUrl}/api/chatrooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chatroom: { name } }),
  });

  const data = (await handleResponse(response)) as ApiChatroom;
  return { id: data.id, name: data.name };
};

export const deleteChatroom = async (chatroomId: number): Promise<void> => {
  const response = await fetch(`${config.apiUrl}/api/chatrooms/${chatroomId}`, {
    method: "DELETE",
  });

  await handleResponse(response);
};

export const fetchOnlineUsers = async (): Promise<string[]> => {
  const response = await fetch(`${config.apiUrl}/api/chatrooms/online_users`);
  const data = (await handleResponse(response)) as { active_names: string[] };
  return data.active_names ?? [];
};

export const createMessage = async (
  chatroomId: number,
  payload: { content: string; senderName: string },
): Promise<ChatMessage> => {
  const response = await fetch(
    `${config.apiUrl}/api/chatrooms/${chatroomId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          content: payload.content,
          sender_name: payload.senderName,
        },
      }),
    },
  );

  const data = (await handleResponse(response)) as ApiMessage;
  return deserializeMessage(data);
};
