/**
 * Makes the typed dictionaries the compile-time key space of i18next: a
 * missing key, a misspelt key or a wrong interpolation variable is a type
 * error at every `t()` call site.
 */
import "i18next";
import type en from "./en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
    returnNull: false;
  }
}
