// @ts-nocheck
import * as React from "react"
import { cn } from "@/lib/utils/cellUtils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] shadow-sm hover:shadow-md"

    const variants = {
      default: "bg-gradient-to-b from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus-visible:ring-blue-500 shadow-blue-500/25",
      destructive: "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus-visible:ring-red-500 shadow-red-500/25",
      success: "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 focus-visible:ring-emerald-500 shadow-emerald-500/25",
      outline: "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-400 shadow-none",
      secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-gray-400 shadow-none",
      ghost: "hover:bg-gray-100 text-gray-700 hover:text-gray-900 focus-visible:ring-gray-400 shadow-none",
      link: "underline-offset-4 hover:underline text-blue-600 hover:text-blue-700 shadow-none",
    }

    const sizes = {
      default: "h-11 py-2.5 px-5",
      sm: "h-9 px-4 text-xs rounded-lg",
      lg: "h-12 px-8 text-base rounded-xl",
      icon: "h-10 w-10 rounded-lg",
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
