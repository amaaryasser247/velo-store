import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-chalk px-6 py-16 text-center sm:py-24">
      <h2 className="type-title text-2xl sm:text-3xl">{title}</h2>
      {description ? <p className="mx-auto mt-3 max-w-md text-graphite">{description}</p> : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}
