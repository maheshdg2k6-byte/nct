import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  className?: string;
}

export function FloatingActionButton({ 
  onClick, 
  icon: Icon, 
  label, 
  className 
}: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed bottom-6 right-6 h-14 w-14 rounded-full z-50",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </Button>
  );
}