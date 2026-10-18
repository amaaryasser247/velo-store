export const SHIPPING_METHODS = ["standard", "express"] as const;

export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export const COUNTRIES = [
  { code: "EG", name: "Egypt" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "AU", name: "Australia" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export interface CheckoutFormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: CountryCode | "";
  shippingMethod: ShippingMethod;
  acceptTerms: boolean;
}

/**
 * Translation keys for validation messages. Validators return keys, never
 * sentences - the render layer translates them, so messages follow the
 * active language.
 */
export type ValidationMessage =
  | "validation.emailRequired"
  | "validation.emailFormat"
  | "validation.nameRequired"
  | "validation.nameShort"
  | "validation.phoneRequired"
  | "validation.phoneDigits"
  | "validation.addressShort"
  | "validation.cityRequired"
  | "validation.postalRequired"
  | "validation.postalFormat"
  | "validation.countryRequired"
  | "validation.shippingRequired"
  | "validation.termsRequired";

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormData, ValidationMessage>>;

export interface OrderSummary {
  itemCount: number;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  /** Amount still needed for free standard shipping; 0 once reached. */
  freeShippingRemaining: number;
}

export interface DemoOrderLine {
  productId: string;
  title: string;
  brand: string;
  size: number;
  quantity: number;
  unitPrice: number;
}

export interface DemoOrder {
  id: string;
  /** ISO 8601 timestamp. */
  placedAt: string;
  customer: {
    fullName: string;
    email: string;
    city: string;
    country: CountryCode;
    shippingMethod: ShippingMethod;
  };
  lines: DemoOrderLine[];
  summary: OrderSummary;
}
