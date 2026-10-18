import { AlertCircle } from "lucide-react";
import { useId, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { formatSize } from "../../utils/currency";

type SizeSelectorProps = {
  sizeRun: readonly number[];
  availableSizes: readonly number[];
  value: number | null;
  onChange: (size: number) => void;
  error?: string | undefined;
  groupRef?: RefObject<HTMLFieldSetElement | null>;
};

export default function SizeSelector({
  sizeRun,
  availableSizes,
  value,
  onChange,
  error,
  groupRef,
}: SizeSelectorProps) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset
      ref={groupRef}
      tabIndex={-1}
      aria-describedby={error ? errorId : undefined}
      className="scroll-mt-28 outline-offset-8"
    >
      <legend className="mb-3 text-sm font-semibold">{t("product.sizeLegend")}</legend>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
        {sizeRun.map((size) => {
          const available = availableSizes.includes(size);
          return (
            <label key={size} className="relative block">
              <input
                type="radio"
                name={`${id}-size`}
                value={size}
                checked={value === size}
                disabled={!available}
                onChange={() => onChange(size)}
                aria-label={`${t("product.sizeAria", { size: formatSize(size) })}${
                  available ? "" : t("product.sizeUnavailable")
                }`}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="flex h-12 cursor-pointer items-center justify-center border border-line bg-surface text-sm font-semibold hover:border-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:text-on-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring peer-disabled:cursor-not-allowed peer-disabled:bg-chalk peer-disabled:text-graphite/60 peer-disabled:line-through peer-disabled:hover:border-line"
              >
                {formatSize(size)}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
