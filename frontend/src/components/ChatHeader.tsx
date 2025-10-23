import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: ReactNode;
}

export const ChatHeader = ({
  title,
  subtitle,
  className,
  children,
}: ChatHeaderProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-12 w-12 overflow-hidden rounded-2xl bg-card flex items-center justify-center shadow-[var(--shadow-card)] border border-border">
        <img
          src="/simpul.png"
          alt="Simpul Chat"
          className="h-10 w-10 object-contain"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {subtitle ?? "Real-time messaging"}
        </p>
        {children}
      </div>
    </div>
  );
};
