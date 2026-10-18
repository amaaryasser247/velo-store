import { AlertCircle } from "lucide-react";
import { useEffect, useId, useRef } from "react";

export interface FormErrorItem<K extends string = string> {
  field: K;
  label: string;
  message: string;
}

interface FormErrorSummaryProps<K extends string> {
  title: string;
  items: ReadonlyArray<FormErrorItem<K>>;
  /** Incremented by the form on every failed submit; focuses the summary. */
  focusRequest: number;
  /** Moves focus to the offending control (the browser scrolls it into view). */
  onSelect: (field: K) => void;
}

/**
 * The focusable error summary: a `role="alert"` box at the top of the form
 * that takes focus after a failed submit, lists every current message as a
 * control that jumps to its field, and leaves the inline errors in place.
 * Renders nothing while there is nothing to list.
 */
export default function FormErrorSummary<K extends string>({
  title,
  items,
  focusRequest,
  onSelect,
}: FormErrorSummaryProps<K>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (focusRequest === 0) return;
    containerRef.current?.focus();
  }, [focusRequest]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="alert"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-error-summary
      className="scroll-mt-28 border border-danger bg-surface p-4 focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      <h2 id={titleId} className="flex items-start gap-1.5 text-sm font-semibold text-danger">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {title}
      </h2>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.field}>
            <button
              type="button"
              onClick={() => onSelect(item.field)}
              className="text-start text-sm font-semibold text-danger underline decoration-2 underline-offset-4 hover:decoration-4"
            >
              {item.label}: {item.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
