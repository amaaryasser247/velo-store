import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  PRODUCT_CATEGORIES,
  type CategoryFilter,
  type FilterOptions,
  type ProductFilters,
} from "../../types/product";
import { formatSize } from "../../utils/currency";
import { countActiveFilters } from "../../utils/filters";
import { useFormat } from "../../i18n/format";
import Button from "../common/Button";

type ProductFilterPanelProps = {
  filters: ProductFilters;
  options: FilterOptions;
  onChange: (next: ProductFilters) => void;
  onReset: () => void;
};

const CATEGORY_CHOICES: readonly CategoryFilter[] = ["all", ...PRODUCT_CATEGORIES];

export default function ProductFilterPanel({
  filters,
  options,
  onChange,
  onReset,
}: ProductFilterPanelProps) {
  const { t } = useTranslation();
  const { price, number } = useFormat();
  const groupId = useId();
  const activeCount = countActiveFilters(filters);
  const priceValue = filters.maxPrice ?? options.maxPrice;

  function handleCategoryChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value;
    const next = CATEGORY_CHOICES.find((choice) => choice === value);
    if (next !== undefined) onChange({ ...filters, category: next });
  }

  function handleBrandChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { value, checked } = event.target;
    const brands = checked
      ? [...filters.brands, value]
      : filters.brands.filter((brand) => brand !== value);
    onChange({ ...filters, brands });
  }

  function handleSizeClick(size: number): void {
    onChange({ ...filters, size: filters.size === size ? null : size });
  }

  function handlePriceChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const value = Number(event.target.value);
    onChange({ ...filters, maxPrice: value >= options.maxPrice ? null : value });
  }

  function handleNewChange(event: React.ChangeEvent<HTMLInputElement>): void {
    onChange({ ...filters, newOnly: event.target.checked });
  }

  return (
    <form
      aria-label={t("shop.productFilters")}
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => event.preventDefault()}
      className="space-y-8"
    >
      <fieldset>
        <legend className="type-title mb-3 text-base">{t("filters.category")}</legend>
        <div className="space-y-2">
          {CATEGORY_CHOICES.map((choice) => (
            <label key={choice} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name={`${groupId}-category`}
                value={choice}
                checked={filters.category === choice}
                onChange={handleCategoryChange}
                className="radio size-4"
              />
              {choice === "all" ? t("filters.allSneakers") : t(`collections.${choice}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-title mb-3 text-base">{t("filters.brand")}</legend>
        <div className="space-y-2">
          {options.brands.map((brand) => (
            <label key={brand} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                value={brand}
                checked={filters.brands.includes(brand)}
                onChange={handleBrandChange}
                className="checkbox size-4"
              />
              <span lang="en">{brand}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-title mb-3 text-base">{t("filters.size")}</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {options.sizes.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={filters.size === size}
              onClick={() => handleSizeClick(size)}
              className={`h-10 border text-sm font-semibold ${
                filters.size === size
                  ? "border-brand bg-brand text-on-brand"
                  : "border-line bg-surface hover:border-ink"
              }`}
            >
              {formatSize(size)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="type-title mb-3 text-base">{t("filters.price")}</legend>
        <label htmlFor={`${groupId}-price`} className="mb-2 block text-sm">
          {filters.maxPrice === null
            ? t("filters.anyPrice")
            : t("filters.upTo", { amount: price(filters.maxPrice) })}
        </label>
        <input
          id={`${groupId}-price`}
          type="range"
          min={options.minPrice}
          max={options.maxPrice}
          step={250}
          value={priceValue}
          onChange={handlePriceChange}
          className="w-full accent-brand"
        />
        <div className="mt-1 flex justify-between text-xs text-graphite">
          <span>{price(options.minPrice)}</span>
          <span>{price(options.maxPrice)}</span>
        </div>
      </fieldset>

      <fieldset>
        <legend className="sr-only">{t("filters.availability")}</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={filters.newOnly}
            onChange={handleNewChange}
            className="checkbox size-4"
          />
          {t("filters.newOnly")}
        </label>
      </fieldset>

      <Button variant="secondary" fullWidth onClick={onReset} disabled={activeCount === 0}>
        {activeCount > 0
          ? t("filters.clearWithCount", { total: number(activeCount) })
          : t("filters.clear")}
      </Button>
    </form>
  );
}
