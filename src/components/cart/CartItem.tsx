import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useFormat } from "../../i18n/format";
import type { CartItem as CartItemType } from "../../types/cart";
import { getMaxQuantity } from "../../utils/cart";
import { formatSize } from "../../utils/currency";
import QuantitySelector from "../products/QuantitySelector";

type CartItemRowProps = {
  item: CartItemType;
  onRemove: (productId: string, size: number) => void;
  onUpdateQuantity: (productId: string, size: number, quantity: number) => void;
};

export default function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const { t } = useTranslation();
  const { price } = useFormat();
  const { product, size, quantity } = item;
  const max = getMaxQuantity(product);
  const href = `/product/${product.id}`;
  const sizeLabel = formatSize(size);

  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-4 py-6 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <Link to={href} className="block aspect-[8/5] self-start bg-plate" tabIndex={-1} aria-hidden="true">
        <img src={product.image} alt="" className="h-full w-full object-cover mix-blend-multiply" />
      </Link>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-graphite" lang="en">
              {product.brand}
            </p>
            <h3 className="font-semibold" lang="en">
              <Link to={href} className="underline-offset-4 decoration-ring decoration-2 hover:underline">
                {product.title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-graphite">{t("common.euSize", { size: sizeLabel })}</p>
          </div>
          <p className="shrink-0 font-semibold">{price(product.price * quantity)}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <QuantitySelector
              value={quantity}
              max={max}
              label={t("bag.quantityLabel", { title: product.title, size: sizeLabel })}
              onChange={(next) => onUpdateQuantity(product.id, size, next)}
            />
            {quantity >= max ? (
              <p className="mt-1.5 text-xs text-graphite">{t("bag.maximum")}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onRemove(product.id, size)}
            aria-label={t("bag.remove", { title: product.title, size: sizeLabel })}
            className="inline-flex h-11 items-center gap-2 px-2 text-sm font-semibold underline-offset-4 decoration-ring decoration-2 hover:underline"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t("bag.removeLabel")}
          </button>
        </div>
      </div>
    </div>
  );
}
