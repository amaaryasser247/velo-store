import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SORT_OPTIONS, type SortOption } from "../../types/product";
import { isSortOption } from "../../utils/filters";

type ProductSortProps = {
  value: SortOption;
  onChange: (sort: SortOption) => void;
};

const SORT_LABEL_KEYS = {
  featured: "sort.featured",
  newest: "sort.newest",
  "price-asc": "sort.priceAsc",
  "price-desc": "sort.priceDesc",
  rating: "sort.rating",
} as const satisfies Record<SortOption, string>;

export default function ProductSort({ value, onChange }: ProductSortProps) {
  const { t } = useTranslation();
  const id = useId();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value;
    if (isSortOption(next)) onChange(next);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {t("sort.label")}
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className="h-12 w-full appearance-none rounded-full border border-line bg-surface ps-5 pe-11 text-sm font-semibold hover:border-ink"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(SORT_LABEL_KEYS[option])}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
    </div>
  );
}
