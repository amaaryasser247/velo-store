import { Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type QuantitySelectorProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (quantity: number) => void;
  label: string;
};

export default function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  label,
}: QuantitySelectorProps) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label} className="inline-flex items-center border border-line bg-surface">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t("quantity.decrease")}
        className="grid size-11 place-items-center hover:bg-chalk disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="w-10 text-center font-semibold">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t("quantity.increase")}
        className="grid size-11 place-items-center hover:bg-chalk disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
