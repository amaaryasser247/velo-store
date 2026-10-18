import { AlertCircle, ChevronDown } from "lucide-react";
import { useId, type ReactNode, type SelectHTMLAttributes } from "react";

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  name: string;
  error?: string | undefined;
  children: ReactNode;
};

export default function SelectField({
  label,
  name,
  error,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const reactId = useId();
  const id = `${reactId}-${name}`;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`h-12 w-full scroll-mt-28 appearance-none border bg-surface ps-4 pe-11 text-base ${
            error ? "border-danger ring-1 ring-danger" : "border-line hover:border-ink"
          }`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
      </div>
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
