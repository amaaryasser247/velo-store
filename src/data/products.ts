/**
 * GENERATED FILE - by scripts/fetch-catalog.ts. Do not edit by hand.
 *
 * Real product data and images collected at build time from adidas Egypt
 * and the Nike German storefront; raw responses cached in scripts/.cache.
 * See public/CREDITS.md and the README "Data sources" section.
 *
 * - Prices are EGP: adidas prices as listed; Nike prices converted from EUR
 *   with the fixed documented demo rate in the script (1 EUR -> 52 EGP).
 * - availableSizes list only the EU sizes the source marked available.
 * - stock is omitted (no reliable public quantity data).
 * - rating only where the source page shows one; isNew is hand-set on the
 *   newest silhouettes (see NOTE below).
 * - Nike titles drop the storefront's localised category suffix.
 *
 * NOTE (hand edits, unlike the rest of this generated file): each product
 * carries an Arabic `translations.ar.description` written for the Arabic UI,
 * and `isNew` is set by hand on the newest silhouettes (the sources do not
 * expose a stable new-in flag). A regenerated catalog would need both
 * re-applied (see the README).
 */
import type { Product } from "../types/product";

export const products: Product[] = [
  {
    id: "DM3493-002",
    title: "Nike SB Chron 2",
    brand: "Nike",
    price: 3639,
    category: "skate",
    description: "Men's skate sneakers in Schwarz/Schwarz/Gum Light Brown/Weiß. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء تزلج رياضي للرجال بلون أسود/أسود/Gum Light Brown/أبيض. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/DM3493-002/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/DM3493-002/1.webp`, `${import.meta.env.BASE_URL}images/products/DM3493-002/2.webp`, `${import.meta.env.BASE_URL}images/products/DM3493-002/3.webp`, `${import.meta.env.BASE_URL}images/products/DM3493-002/4.webp`],
    availableSizes: [36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47.5, 48.5, 49.5],
    rating: 4.5,
    isNew: false,
  },
  {
    id: "HQ1625-201",
    title: "Nike SB Dunk Low Pro",
    brand: "Nike",
    price: 6239,
    category: "skate",
    description: "Men's skate sneakers in Filbert/Schwarz/Burgundy Ash/Light Chocolate. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء تزلج رياضي للرجال بلون Filbert/أسود/Burgundy Ash/Light Chocolate. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/HQ1625-201/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/HQ1625-201/1.webp`, `${import.meta.env.BASE_URL}images/products/HQ1625-201/2.webp`, `${import.meta.env.BASE_URL}images/products/HQ1625-201/3.webp`, `${import.meta.env.BASE_URL}images/products/HQ1625-201/4.webp`],
    availableSizes: [36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47.5, 48.5, 49.5],
    rating: 5,
    isNew: true,
  },
  {
    id: "HV5953-001",
    title: "Nike Air Force 1 ’07 LX Vibram",
    brand: "Nike",
    price: 8319,
    category: "lifestyle",
    description: "Men's lifestyle sneakers in Off Noir/Speed Yellow/Schwarz. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء لايف ستايل للرجال بلون Off Noir/Speed Yellow/أسود. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/HV5953-001/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/HV5953-001/1.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-001/2.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-001/3.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-001/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: false,
  },
  {
    id: "HV5953-002",
    title: "Nike Air Force 1 ’07 LX Vibram",
    brand: "Nike",
    price: 8319,
    category: "lifestyle",
    description: "Men's lifestyle sneakers in Black Pine/Schwarz/Pink Foam/Tech Grey. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء لايف ستايل للرجال بلون Black Pine/أسود/Pink Foam/Tech Grey. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/HV5953-002/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/HV5953-002/1.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-002/2.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-002/3.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-002/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    rating: 4.5,
    isNew: true,
  },
  {
    id: "HV5953-100",
    title: "Nike Air Force 1 ’07 LX Vibram",
    brand: "Nike",
    price: 8319,
    category: "lifestyle",
    description: "Men's lifestyle sneakers in Summit White/Off White/Speed Yellow/Summit White. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء لايف ستايل للرجال بلون Summit White/Off White/Speed Yellow/Summit White. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/HV5953-100/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/HV5953-100/1.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-100/2.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-100/3.webp`, `${import.meta.env.BASE_URL}images/products/HV5953-100/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: false,
  },
  {
    id: "IH1943-002",
    title: "Nike Air Force 1 ’07 LX Vibram",
    brand: "Nike",
    price: 6759,
    category: "lifestyle",
    description: "Men's lifestyle sneakers in Schwarz/Light Lemon Twist/Speed Yellow/Smoke Grey. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء لايف ستايل للرجال بلون أسود/Light Lemon Twist/Speed Yellow/Smoke Grey. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IH1943-002/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IH1943-002/1.webp`, `${import.meta.env.BASE_URL}images/products/IH1943-002/2.webp`, `${import.meta.env.BASE_URL}images/products/IH1943-002/3.webp`, `${import.meta.env.BASE_URL}images/products/IH1943-002/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: false,
  },
  {
    id: "IH7423-600",
    title: "Caitlin 1 \"Caitlin Blue\"",
    brand: "Nike",
    price: 7279,
    category: "basketball",
    description: "Men's basketball sneakers in Hot Punch/Neo Pink. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء كرة سلة للرجال بلون Hot Punch/Neo Pink. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IH7423-600/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IH7423-600/1.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-600/2.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-600/3.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-600/4.webp`],
    availableSizes: [38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 48],
    isNew: false,
  },
  {
    id: "IH7423-700",
    title: "Caitlin 1 \"Caitlin Blue\"",
    brand: "Nike",
    price: 7279,
    category: "basketball",
    description: "Men's basketball sneakers in Yellow Zest/Soft Yellow/Racer Blue. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء كرة سلة للرجال بلون Yellow Zest/Soft Yellow/Racer Blue. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IH7423-700/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IH7423-700/1.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-700/2.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-700/3.webp`, `${import.meta.env.BASE_URL}images/products/IH7423-700/4.webp`],
    availableSizes: [36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 48],
    isNew: true,
  },
  {
    id: "IM2541-101",
    title: "Nike Pegasus Plus 2",
    brand: "Nike",
    price: 8839,
    category: "running",
    description: "Men's running sneakers in Weiß/Lemon Venom/Schwarz. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء جري للرجال بلون أبيض/Lemon Venom/أسود. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IM2541-101/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IM2541-101/1.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-101/2.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-101/3.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-101/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    rating: 4.5,
    isNew: false,
  },
  {
    id: "IM2541-400",
    title: "Nike Pegasus Plus 2",
    brand: "Nike",
    price: 8839,
    category: "running",
    description: "Men's running sneakers in Midnight Navy/Racer Blue/Grey Mist/Schwarz. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء جري للرجال بلون Midnight Navy/Racer Blue/Grey Mist/أسود. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IM2541-400/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IM2541-400/1.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-400/2.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-400/3.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-400/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: true,
  },
  {
    id: "IM2541-600",
    title: "Nike Pegasus Plus 2",
    brand: "Nike",
    price: 8839,
    category: "running",
    description: "Men's running sneakers in Flash Crimson/Schwarz/Light Smoke Grey/Metallic Silver. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء جري للرجال بلون Flash Crimson/أسود/Light Smoke Grey/Metallic Silver. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IM2541-600/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IM2541-600/1.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-600/2.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-600/3.webp`, `${import.meta.env.BASE_URL}images/products/IM2541-600/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: false,
  },
  {
    id: "IM4135-001",
    title: "Ja 4 \"Deep Water\"",
    brand: "Nike",
    price: 6759,
    category: "basketball",
    description: "Men's basketball sneakers in Schwarz/Cobalt Bliss/Dark Smoke Grey/Metallic Silver. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء كرة سلة للرجال بلون أسود/Cobalt Bliss/Dark Smoke Grey/Metallic Silver. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IM4135-001/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IM4135-001/1.webp`, `${import.meta.env.BASE_URL}images/products/IM4135-001/2.webp`, `${import.meta.env.BASE_URL}images/products/IM4135-001/3.webp`, `${import.meta.env.BASE_URL}images/products/IM4135-001/4.webp`],
    availableSizes: [35.5, 36, 36.5, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48, 48.5, 49.5, 50.5, 51.5, 52.5],
    rating: 4.5,
    isNew: false,
  },
  {
    id: "IV5066-003",
    title: "Nike Hybrid RN",
    brand: "Nike",
    price: 7279,
    category: "training",
    description: "Men's training sneakers in Gridiron/Schwarz/Light Silver/Dusty Cactus. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء تدريب للرجال بلون Gridiron/أسود/Light Silver/Dusty Cactus. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IV5066-003/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IV5066-003/1.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-003/2.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-003/3.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-003/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    isNew: true,
  },
  {
    id: "IV5066-101",
    title: "Nike Hybrid RN",
    brand: "Nike",
    price: 7279,
    category: "training",
    description: "Men's training sneakers in Weiß/Schwarz/Laser Crimson/Metallic Silver. Collected as a build-time snapshot from the Nike (German store) web store; price, colour and available sizes are shown as the source page listed them.",
    translations: {
      ar: {
        description:
          "حذاء تدريب للرجال بلون أبيض/أسود/Laser Crimson/Metallic Silver. لقطة جُمعت وقت البناء من متجر Nike الإلكتروني في ألمانيا؛ السعر واللون والمقاسات المتوفرة معروضة كما وردت في الصفحة المصدر.",
      },
    },
    image: `${import.meta.env.BASE_URL}images/products/IV5066-101/1.webp`,
    images: [`${import.meta.env.BASE_URL}images/products/IV5066-101/1.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-101/2.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-101/3.webp`, `${import.meta.env.BASE_URL}images/products/IV5066-101/4.webp`],
    availableSizes: [38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 45.5, 46, 47, 47.5, 48.5, 49.5],
    rating: 4,
    isNew: false,
  },
];
