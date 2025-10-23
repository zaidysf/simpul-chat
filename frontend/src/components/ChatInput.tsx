import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => Promise<void> | void;
}

export const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetInput = () => {
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSendMessage(trimmed);
      resetInput();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="min-h-[56px] max-h-[120px] resize-none rounded-2xl bg-card border-border focus-visible:ring-primary transition-all duration-200"
        rows={1}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!message.trim() || isSubmitting}
        className="h-[56px] w-[56px] rounded-2xl bg-primary hover:bg-[hsl(var(--primary-dark))] transition-all duration-200 shadow-[var(--shadow-message)] disabled:opacity-50"
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
};
