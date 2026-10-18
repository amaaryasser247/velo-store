import type { ReactNode } from "react";

type ContainerProps = {
  as?: "div" | "section" | "header" | "footer" | "nav";
  className?: string;
  children: ReactNode;
};

export default function Container({ as: Tag = "div", className = "", children }: ContainerProps) {
  return (
    <Tag className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10 ${className}`}>
      {children}
    </Tag>
  );
}
