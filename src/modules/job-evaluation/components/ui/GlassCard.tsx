
import React from "react";
import { cn } from "@/modules/job-evaluation/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "subtle";
  className?: string;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = "default",
  className,
  hoverEffect = false,
  ...props
}) => {
  const variantStyles = {
    default: "glass shadow-md",
    elevated: "glass shadow-lg border-opacity-30",
    subtle: "glass shadow-sm bg-opacity-10 backdrop-blur-sm",
  };

  return (
    <div
      className={cn(
        variantStyles[variant],
        "rounded-xl p-6 transition-all duration-300",
        hoverEffect && "hover-lift",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
