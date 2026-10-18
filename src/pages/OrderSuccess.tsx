import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import CartSummary from "../components/cart/CartSummary";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useFormat } from "../i18n/format";
import { COUNTRIES, type DemoOrder, type ShippingMethod } from "../types/checkout";
import { formatSize } from "../utils/currency";
import { parseDemoOrder } from "../utils/parsers";
import { STORAGE_KEYS } from "../utils/storage";

const SHIPPING_KEYS = {
  standard: "order.standardShipping",
  express: "order.expressShipping",
} as const satisfies Record<ShippingMethod, string>;

export default function OrderSuccess() {
  const { t } = useTranslation();
  const { price, date, region } = useFormat();
  useDocumentTitle(t("meta.orderPlaced"));
  const [order] = useLocalStorage<DemoOrder | null>(STORAGE_KEYS.lastOrder, null, parseDemoOrder);

  if (order === null) {
    return (
      <Container className="py-12">
        <EmptyState
          title={t("order.noOrder")}
          description={t("order.noOrderText")}
          action={<ButtonLink to="/shop">{t("checkout.emptyButton")}</ButtonLink>}
        />
      </Container>
    );
  }

  const country = region(
    order.customer.country,
    COUNTRIES.find((candidate) => candidate.code === order.customer.country)?.name ??
      order.customer.country,
  );
  const placed = date(order.placedAt);

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="type-display text-[clamp(3rem,9vw,6.5rem)]">{t("order.title")}</h1>
      <p className="mt-4 max-w-xl text-lg">{t("order.thanks", { name: order.customer.fullName })}</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div>
          <dl className="grid gap-6 border-y border-fog py-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-graphite">{t("order.number")}</dt>
              <dd className="mt-1 font-semibold">
                <bdi dir="ltr">{order.id}</bdi>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-graphite">{t("order.placed")}</dt>
              <dd className="mt-1 font-semibold">{placed}</dd>
            </div>
            <div>
              <dt className="text-sm text-graphite">{t("order.delivery")}</dt>
              <dd className="mt-1 font-semibold">
                {order.customer.city}, {country}
                <span className="block text-sm font-normal text-graphite">
                  {t(SHIPPING_KEYS[order.customer.shippingMethod])}
                </span>
              </dd>
            </div>
          </dl>

          <h2 className="type-title mt-8 text-xl">{t("order.items")}</h2>
          <ul className="mt-4 divide-y divide-fog border-y border-fog">
            {order.lines.map((line) => (
              <li
                key={`${line.productId}-${line.size}`}
                className="flex justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-semibold">
                    <bdi lang="en">{line.title}</bdi>
                    <span className="font-normal text-graphite">
                      {" "}
                      {t("order.byBrand", { brand: line.brand })}
                    </span>
                  </p>
                  <p className="text-sm text-graphite">
                    {t("order.quantityLine", {
                      size: formatSize(line.size),
                      quantity: String(line.quantity),
                    })}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">
                  {price(line.unitPrice * line.quantity)}
                </p>
              </li>
            ))}
          </ul>

          <ButtonLink to="/shop" size="lg" className="mt-10">
            {t("order.continueShopping")}
          </ButtonLink>
        </div>

        <div className="lg:self-start">
          <CartSummary summary={order.summary} title={t("order.totalTitle")} />
        </div>
      </div>
    </Container>
  );
}
