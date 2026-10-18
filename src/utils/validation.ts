import {
  COUNTRIES,
  SHIPPING_METHODS,
  type CheckoutFormData,
  type CheckoutFormErrors,
  type CountryCode,
  type ShippingMethod,
  type ValidationMessage,
} from "../types/checkout.ts";
import { isStringIn } from "./guards.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,8}[A-Za-z0-9]$/;

export const INITIAL_CHECKOUT_FORM: CheckoutFormData = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  // Default to Egypt, matching the EGP currency and Egyptian shipping rates.
  country: "EG",
  shippingMethod: "standard",
  acceptTerms: false,
};

export const CHECKOUT_FIELD_ORDER: readonly (keyof CheckoutFormData)[] = [
  "fullName",
  "email",
  "phone",
  "address",
  "city",
  "postalCode",
  "country",
  "shippingMethod",
  "acceptTerms",
];

const COUNTRY_CODES = COUNTRIES.map((country) => country.code);

export function isCountryCode(value: unknown): value is CountryCode {
  return isStringIn(COUNTRY_CODES, value);
}

export function isShippingMethod(value: unknown): value is ShippingMethod {
  return isStringIn(SHIPPING_METHODS, value);
}

export function isCheckoutField(name: string): name is keyof CheckoutFormData {
  return (CHECKOUT_FIELD_ORDER as readonly string[]).includes(name);
}

/**
 * Validators return typed message KEYS, translated at render time.
 */
export function validateEmail(value: string): ValidationMessage | undefined {
  const email = value.trim();
  if (email === "") return "validation.emailRequired";
  if (!EMAIL_PATTERN.test(email)) return "validation.emailFormat";
  return undefined;
}

export function validateCheckoutField(
  field: keyof CheckoutFormData,
  data: CheckoutFormData,
): ValidationMessage | undefined {
  switch (field) {
    case "fullName": {
      const name = data.fullName.trim();
      if (name === "") return "validation.nameRequired";
      if (name.length < 2) return "validation.nameShort";
      return undefined;
    }
    case "email":
      return validateEmail(data.email);
    case "phone": {
      const phone = data.phone.trim();
      if (phone === "") return "validation.phoneRequired";
      const digits = phone.replace(/\D/g, "");
      if (!PHONE_PATTERN.test(phone) || digits.length < 7 || digits.length > 15) {
        return "validation.phoneDigits";
      }
      return undefined;
    }
    case "address":
      return data.address.trim().length < 5 ? "validation.addressShort" : undefined;
    case "city":
      return data.city.trim().length < 2 ? "validation.cityRequired" : undefined;
    case "postalCode": {
      const postal = data.postalCode.trim();
      if (postal === "") return "validation.postalRequired";
      if (!POSTAL_PATTERN.test(postal)) {
        return "validation.postalFormat";
      }
      return undefined;
    }
    case "country":
      return isCountryCode(data.country) ? undefined : "validation.countryRequired";
    case "shippingMethod":
      return isShippingMethod(data.shippingMethod) ? undefined : "validation.shippingRequired";
    case "acceptTerms":
      return data.acceptTerms ? undefined : "validation.termsRequired";
  }
}

export function validateCheckoutForm(data: CheckoutFormData): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};
  for (const field of CHECKOUT_FIELD_ORDER) {
    const message = validateCheckoutField(field, data);
    if (message !== undefined) errors[field] = message;
  }
  return errors;
}
