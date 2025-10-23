import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageDto } from "@/types/chat";

interface ChatMessageProps {
  message: ChatMessageDto & { isCurrentUser: boolean };
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const initials = message.senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const createdAt = new Date(message.createdAt);

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        message.isCurrentUser && "flex-row-reverse"
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-sm font-medium",
          message.isCurrentUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-secondary text-secondary-foreground"
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          message.isCurrentUser && "items-end"
        )}
      >
        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-medium text-foreground">
            {message.senderName}
          </span>
          <span className="text-xs text-muted-foreground">
            {createdAt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 transition-all duration-200",
            message.isCurrentUser
              ? "bg-[hsl(var(--chat-sent))] text-[hsl(var(--chat-sent-foreground))] rounded-tr-md shadow-[var(--shadow-message)]"
              : "bg-[hsl(var(--chat-received))] text-[hsl(var(--chat-received-foreground))] rounded-tl-md shadow-[var(--shadow-message)] border border-border"
          )}
        >
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    </div>
  );
};
