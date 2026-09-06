import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "cta-arrow inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold cursor-pointer transition-[transform,box-shadow,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-2 border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--ink)] active:shadow-[1px_1px_0_0_var(--ink)]",
        destructive:
          "border-2 border-border bg-destructive text-destructive-foreground shadow-[3px_3px_0_0_var(--ink)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--ink)] active:shadow-[1px_1px_0_0_var(--ink)]",
        outline:
          "border-2 border-border bg-card text-foreground shadow-[3px_3px_0_0_var(--ink)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--ink)] active:shadow-[1px_1px_0_0_var(--ink)]",
        secondary:
          "border-2 border-border bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--ink)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[5px_5px_0_0_var(--ink)] active:shadow-[1px_1px_0_0_var(--ink)]",
        ghost: "hover:bg-muted hover:text-foreground active:translate-x-0 active:translate-y-0",
        link: "text-foreground underline-offset-4 hover:underline active:translate-x-0 active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-13 rounded-2xl px-7 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
