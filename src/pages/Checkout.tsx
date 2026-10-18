import { AlertCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import CartSummary from "../components/cart/CartSummary";
import Button, { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import FormErrorSummary from "../components/common/FormErrorSummary";
import SelectField from "../components/common/SelectField";
import TextField from "../components/common/TextField";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useFormat } from "../i18n/format";
import { formatSize } from "../utils/currency";
import {
  COUNTRIES,
  SHIPPING_METHODS,
  type CheckoutFormData,
  type CheckoutFormErrors,
  type DemoOrder,
  type ShippingMethod,
  type ValidationMessage,
} from "../types/checkout";
import { calculateOrderSummary, calculateShipping } from "../utils/cart";
import { STORAGE_KEYS, writeStorage } from "../utils/storage";
import {
  CHECKOUT_FIELD_ORDER,
  INITIAL_CHECKOUT_FORM,
  isCheckoutField,
  isCountryCode,
  isShippingMethod,
  validateCheckoutField,
  validateCheckoutForm,
} from "../utils/validation";

const TEXT_FIELDS = ["fullName", "email", "phone", "address", "city", "postalCode"] as const;
type TextFieldName = (typeof TEXT_FIELDS)[number];

function isTextField(name: string): name is TextFieldName {
  return (TEXT_FIELDS as readonly string[]).includes(name);
}

const SHIPPING_LABEL_KEYS = {
  standard: "checkout.standard",
  express: "checkout.express",
} as const satisfies Record<ShippingMethod, string>;

const SHIPPING_DETAIL_KEYS = {
  standard: "checkout.standardDetail",
  express: "checkout.expressDetail",
} as const satisfies Record<ShippingMethod, string>;

/** Short field names for the error summary items. */
const CHECKOUT_LABEL_KEYS = {
  fullName: "checkout.fullName",
  email: "checkout.email",
  phone: "checkout.phone",
  address: "checkout.street",
  city: "checkout.city",
  postalCode: "checkout.postal",
  country: "checkout.country",
  shippingMethod: "checkout.shippingSection",
  acceptTerms: "common.terms",
} as const satisfies Record<keyof CheckoutFormData, string>;

function createOrderId(): string {
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `VL-${Date.now().toString(36).toUpperCase()}${suffix}`;
}

export default function Checkout() {
  const { t } = useTranslation();
  const { price, region } = useFormat();
  useDocumentTitle(t("meta.checkout"));
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  // Signed-in shoppers start with their name and email filled in; both stay editable.
  const [form, setForm] = useState<CheckoutFormData>(() => ({
    ...INITIAL_CHECKOUT_FORM,
    ...(user === null ? {} : { fullName: user.name, email: user.email }),
  }));
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryFocusRequest, setSummaryFocusRequest] = useState(0);

  const summary = useMemo(
    () => calculateOrderSummary(items, form.shippingMethod),
    [items, form.shippingMethod],
  );
  const standardSubtotal = useMemo(() => calculateOrderSummary(items).subtotal, [items]);

  const summaryItems = CHECKOUT_FIELD_ORDER.flatMap((field) => {
    const message = errors[field];
    return message === undefined
      ? []
      : [{ field, label: t(CHECKOUT_LABEL_KEYS[field]), message: t(message) }];
  });

  /** Validation returns message KEYS; they are translated at render time. */
  function setFieldError(field: keyof CheckoutFormData, message: ValidationMessage | undefined): void {
    setErrors((previous) => {
      if (previous[field] === message) return previous;
      const next = { ...previous };
      if (message === undefined) delete next[field];
      else next[field] = message;
      return next;
    });
  }

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = event.target;
    if (!isTextField(name)) return;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFieldError(name, undefined);
  }

  function handleCountryChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const { value } = event.target;
    setForm((previous) => ({
      ...previous,
      country: isCountryCode(value) ? value : "",
    }));
    setFieldError("country", undefined);
  }

  function handleShippingChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { value } = event.target;
    if (!isShippingMethod(value)) return;
    setForm((previous) => ({ ...previous, shippingMethod: value }));
  }

  function handleTermsChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const { checked } = event.target;
    setForm((previous) => ({ ...previous, acceptTerms: checked }));
    setFieldError("acceptTerms", undefined);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name } = event.target;
    if (!isCheckoutField(name) || name === "shippingMethod" || name === "acceptTerms") return;
    setFieldError(name, validateCheckoutField(name, form));
  }

  function focusField(field: keyof CheckoutFormData): void {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateCheckoutForm(form);
    setErrors(nextErrors);

    const firstInvalid = CHECKOUT_FIELD_ORDER.find((field) => nextErrors[field] !== undefined);
    if (firstInvalid !== undefined) {
      setSummaryVisible(true);
      setSummaryFocusRequest((request) => request + 1);
      return;
    }
    if (!isCountryCode(form.country)) return;

    setSubmitting(true);

    const order: DemoOrder = {
      id: createOrderId(),
      placedAt: new Date().toISOString(),
      customer: {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        country: form.country,
        shippingMethod: form.shippingMethod,
      },
      lines: items.map((item) => ({
        productId: item.product.id,
        title: item.product.title,
        brand: item.product.brand,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.product.price,
      })),
      summary,
    };

    writeStorage(STORAGE_KEYS.lastOrder, order);
    clearCart();
    navigate("/order-success", { replace: true });
  }

  if (items.length === 0 && !submitting) {
    return (
      <Container className="py-12">
        <EmptyState
          title={t("checkout.emptyTitle")}
          description={t("checkout.emptyText")}
          action={<ButtonLink to="/shop">{t("checkout.emptyButton")}</ButtonLink>}
        />
      </Container>
    );
  }

  const legendClass = "type-title mb-4 text-xl";

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="type-display text-[clamp(3rem,9vw,6.5rem)]">{t("checkout.title")}</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-10">
          {summaryVisible ? (
            <FormErrorSummary
              title={t("checkout.fixErrors")}
              items={summaryItems}
              focusRequest={summaryFocusRequest}
              onSelect={focusField}
            />
          ) : null}

          <fieldset>
            <legend className={legendClass}>{t("checkout.contact")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("checkout.fullName")}
                name="fullName"
                autoComplete="name"
                value={form.fullName}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.fullName ? t(errors.fullName) : undefined}
                className="sm:col-span-2"
              />
              <TextField
                label={t("checkout.email")}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                value={form.email}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.email ? t(errors.email) : undefined}
              />
              <TextField
                label={t("checkout.phone")}
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                value={form.phone}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.phone ? t(errors.phone) : undefined}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>{t("checkout.addressSection")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("checkout.street")}
                name="address"
                autoComplete="street-address"
                value={form.address}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.address ? t(errors.address) : undefined}
                className="sm:col-span-2"
              />
              <TextField
                label={t("checkout.city")}
                name="city"
                autoComplete="address-level2"
                value={form.city}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.city ? t(errors.city) : undefined}
              />
              <TextField
                label={t("checkout.postal")}
                name="postalCode"
                autoComplete="postal-code"
                dir="ltr"
                value={form.postalCode}
                onChange={handleTextChange}
                onBlur={handleBlur}
                error={errors.postalCode ? t(errors.postalCode) : undefined}
              />
              <SelectField
                label={t("checkout.country")}
                name="country"
                autoComplete="country"
                value={form.country}
                onChange={handleCountryChange}
                onBlur={handleBlur}
                error={errors.country ? t(errors.country) : undefined}
                className="sm:col-span-2"
              >
                <option value="">{t("checkout.chooseCountry")}</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {region(country.code, country.name)}
                  </option>
                ))}
              </SelectField>
            </div>
          </fieldset>

          <fieldset>
            <legend className={legendClass}>{t("checkout.shippingSection")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {SHIPPING_METHODS.map((method) => {
                const cost = calculateShipping(standardSubtotal, method);
                return (
                  <label key={method} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method}
                      checked={form.shippingMethod === method}
                      onChange={handleShippingChange}
                      className="peer sr-only"
                    />
                    <span className="flex items-start justify-between gap-4 border border-line bg-surface p-4 hover:border-ink peer-checked:border-brand peer-checked:ring-1 peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                      <span>
                        <span className="block font-semibold">{t(SHIPPING_LABEL_KEYS[method])}</span>
                        <span className="block text-sm text-graphite">
                          {t(SHIPPING_DETAIL_KEYS[method])}
                        </span>
                      </span>
                      <span className="font-semibold">
                        {cost === 0 ? t("checkout.free") : price(cost)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={form.acceptTerms}
                onChange={handleTermsChange}
                aria-invalid={errors.acceptTerms ? true : undefined}
                aria-describedby={errors.acceptTerms ? "terms-error" : undefined}
                className="checkbox mt-0.5 size-5 shrink-0 scroll-mt-28"
              />
              <span>{t("checkout.terms")}</span>
            </label>
            {errors.acceptTerms ? (
              <p
                id="terms-error"
                className="mt-2 flex items-start gap-1.5 text-sm font-semibold text-danger"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t(errors.acceptTerms)}
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" fullWidth disabled={submitting}>
            {t("checkout.placeOrder")}
          </Button>
        </form>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary summary={summary} title={t("checkout.yourOrder")}>
            <ul
              aria-label={t("checkout.orderItemsAria")}
              className="space-y-3 border-t border-fog pt-5 text-sm"
            >
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.quantity} x <bdi lang="en">{item.product.title}</bdi>
                    <span className="block text-graphite">
                      {t("common.euSize", { size: formatSize(item.size) })}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold">
                    {price(item.product.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-sm">
              <Link to="/cart" className="underline underline-offset-4">
                {t("checkout.editBag")}
              </Link>
            </p>
          </CartSummary>
        </div>
      </div>
    </Container>
  );
}
