import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "btn-primary-gradient text-primary-foreground shadow-sm hover:shadow-md",
        secondary: "btn-glass",
        outline: "bg-transparent border border-[rgba(148,163,184,0.22)] text-foreground hover:bg-[rgba(148,163,184,0.12)]",
        ghost: "btn-ghost",
        accent: "bg-[rgba(34,211,238,0.14)] text-accent border border-[rgba(34,211,238,0.28)] hover:bg-[rgba(34,211,238,0.22)]",
        marketing: "btn-marketing text-[#05070A] shadow-[var(--shadow-glow-cyan)] hover:brightness-110",
        destructive: "btn-danger",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
});

export { buttonVariants };
