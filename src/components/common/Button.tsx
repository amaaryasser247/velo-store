import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
export type ButtonSize = "md" | "lg" | "field";

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-40";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-on-brand hover:bg-brand-strong active:bg-brand-pressed",
  secondary: "border border-ink bg-surface text-ink hover:bg-ink hover:text-paper",
  ghost:
    "text-ink underline-offset-4 decoration-ring decoration-2 hover:underline",
  inverse: "bg-paper text-ink hover:bg-chalk",
  /** Destructive actions; outlined so it never competes with the primary CTA. */
  danger: "border border-danger bg-surface text-danger hover:bg-chalk",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
  /** Matches the 48px height of text inputs and selects. */
  field: "h-12 px-6 text-sm",
};

function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: StyleProps & { className?: string }): string {
  return [BASE, VARIANTS[variant], SIZES[size], fullWidth ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & StyleProps;

export default function Button({
  variant,
  size,
  fullWidth,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}

export type ButtonLinkProps = LinkProps & StyleProps;

export function ButtonLink({ variant, size, fullWidth, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, fullWidth, className })} {...props} />;
}
