import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
  }
>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "bg-[#343c27] text-[#f8f7f3] hover:bg-[#4a5538]",
        variant === "secondary" &&
          "border border-[#343c27]/20 bg-white text-[#343c27] hover:bg-[#f3f2ec]",
        variant === "ghost" && "text-[#343c27] hover:bg-[#343c27]/5",
        variant === "danger" &&
          "bg-red-700 text-white hover:bg-red-800",
        size === "sm" && "h-8 px-3 text-sm",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-11 px-6 text-base",
        className,
      )}
      {...props}
    />
  );
});
