import { AlertCircle } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  name: string;
  error?: string | undefined;
  hint?: string;
  /** Extra id(s) appended to aria-describedby (e.g. a live password checklist). */
  describedBy?: string | undefined;
  /** Control rendered at the field's end edge (e.g. a show/hide password button). */
  trailing?: ReactNode;
};

export default function TextField({
  label,
  name,
  error,
  hint,
  describedBy,
  trailing,
  className = "",
  ...props
}: TextFieldProps) {
  const reactId = useId();
  const id = `${reactId}-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedByIds = [hintId, errorId, describedBy].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          className={`h-12 w-full scroll-mt-28 border bg-surface ps-4 text-base placeholder:text-graphite ${
            trailing ? "pe-14" : "pe-4"
          } ${error ? "border-danger ring-1 ring-danger" : "border-line hover:border-ink"}`}
          {...props}
        />
        {trailing ? (
          <div className="absolute end-1 top-1/2 -translate-y-1/2">{trailing}</div>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-sm text-graphite">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
