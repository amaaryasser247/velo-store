/**
 * English dictionary. Single source of truth for every user-visible string.
 *
 * - `ar.ts` is typed as `typeof en`, so a missing or extra key in either file
 *   is a compile error (the key sets can never drift).
 * - Counted strings use six plural-form suffixes (_zero/_one/_two/_few/_many/
 *   _other) in BOTH locales so the key sets stay equal; `tPlural()` picks the
 *   form with `Intl.PluralRules` for the active locale. English only ever uses
 *   _one and _other, the other four are simply identical to _other.
 * - Placeholders are interpolated by i18next: {{name}}.
 * - The brand name "VELO" and language endonyms ("English", "العربية") are
 *   intentionally identical in both files (see scripts/check-i18n.ts allowlist).
 */
const en = {
  meta: {
    base: "VELO | Sneaker store",
    shop: "Shop",
    wishlist: "Wishlist",
    bag: "Bag",
    checkout: "Checkout",
    orderPlaced: "Order placed",
    product: "Product",
    notFound: "Page not found",
    login: "Log in",
    signup: "Create account",
    account: "Account",
  },

  common: {
    skipToContent: "Skip to main content",
    tryAgain: "Try again",
    euSize: "EU size {{size}}",
    terms: "Terms",
  },

  nav: {
    shop: "Shop",
    newArrivals: "New arrivals",
    wishlist: "Wishlist",
    bag: "Bag",
    about: "About",
    primary: "Primary",
    mobile: "Mobile",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    search: "Search sneakers",
    home: "VELO home",
    account: "Account",
    accountNamed: "Account, {{name}}",
    wishlistCount_zero: "Wishlist, no items",
    wishlistCount_one: "Wishlist, 1 item",
    wishlistCount_two: "Wishlist, 2 items",
    wishlistCount_few: "Wishlist, {{count}} items",
    wishlistCount_many: "Wishlist, {{count}} items",
    wishlistCount_other: "Wishlist, {{count}} items",
    bagCount_zero: "Bag, no items",
    bagCount_one: "Bag, 1 item",
    bagCount_two: "Bag, 2 items",
    bagCount_few: "Bag, {{count}} items",
    bagCount_many: "Bag, {{count}} items",
    bagCount_other: "Bag, {{count}} items",
  },

  announcement: {
    text: "Free standard shipping on orders over {{amount}}.",
    dismiss: "Dismiss announcement",
  },

  hero: {
    srName: "VELO: premium sneakers",
    fallbackTagline:
      "A catalog of real sneaker pairs, listed exactly as their source stores listed them.",
    pairs_zero: "No real pairs in this snapshot yet; the catalog appears once data is collected.",
    pairs_one:
      "One real pair collected at build time from the {{sources}} store listings, shown with its own price, colour and size run.",
    pairs_two:
      "{{count}} real pairs collected at build time from the {{sources}} store listings, shown with their own prices, colours and size runs.",
    pairs_few:
      "{{count}} real pairs collected at build time from the {{sources}} store listings, shown with their own prices, colours and size runs.",
    pairs_many:
      "{{count}} real pairs collected at build time from the {{sources}} store listings, shown with their own prices, colours and size runs.",
    pairs_other:
      "{{count}} real pairs collected at build time from the {{sources}} store listings, shown with their own prices, colours and size runs.",
    shopAll: "Shop all sneakers",
    newArrivals: "New arrivals",
  },

  collections: {
    title: "Shop by sport",
    running: "Running",
    basketball: "Basketball",
    lifestyle: "Lifestyle",
    training: "Training",
    skate: "Skate",
    runningBlurb: "Daily miles and race days.",
    basketballBlurb: "Court grip and ankle support.",
    lifestyleBlurb: "Everyday pairs, worn off the clock.",
    trainingBlurb: "Flat, stable foundations for lifting.",
    skateBlurb: "Board feel and padded toes.",
  },

  sections: {
    newArrivalsTitle: "New arrivals",
    newArrivalsText: "The latest colourways, in the shops now.",
    newArrivalsLink: "See all new arrivals",
    topRatedTitle: "Highest rated",
    topRatedText: "What customers rate best across the range.",
    topRatedLink: "Shop by rating",
    moreToTry: "More to try",
  },

  story: {
    statement:
      "A small, curated shelf: real pairs, listed exactly as the source stores listed them.",
    fitsTitle: "Fits as listed",
    fitsText:
      "Full EU runs with thirds, showing only the sizes the source store actually stocked.",
    returnsTitle: "Thirty-day returns",
    returnsText: "Wear them indoors. If they are not right, send them back.",
    shippingTitle: "Free over {{amount}}",
    shippingText: "Standard shipping costs nothing once your bag passes {{amount}}.",
  },

  footer: {
    about:
      "A storefront built from a real, build-time snapshot of public sneaker listings. Nothing is charged and nothing ships.",
    shopHeading: "Shop",
    companyHeading: "VELO",
    aboutLink: "About",
    wishlistLink: "Wishlist",
    bagLink: "Bag",
    shopByCategory: "Shop by category",
    company: "Company",
  },

  shop: {
    title: "Shop",
    newIn: "New in",
    resultCount_zero: "No sneakers",
    resultCount_one: "1 sneaker",
    resultCount_two: "2 sneakers",
    resultCount_few: "{{count}} sneakers",
    resultCount_many: "{{count}} sneakers",
    resultCount_other: "{{count}} sneakers",
    searchLabel: "Search sneakers",
    searchPlaceholder: "Search by name, brand or category",
    filtersLabel: "Filters",
    filtersHeading: "Filters",
    productFilters: "Product filters",
    noMatchTitle: "No sneakers match",
    noMatchText: "Try a different search or remove some filters.",
    clearAll: "Clear search and filters",
  },

  sort: {
    label: "Sort products",
    featured: "Featured",
    newest: "Newest first",
    priceAsc: "Price: low to high",
    priceDesc: "Price: high to low",
    rating: "Highest rated",
  },

  filters: {
    category: "Category",
    brand: "Brand",
    size: "Size (EU)",
    price: "Price",
    anyPrice: "Any price",
    upTo: "Up to {{amount}}",
    availability: "Availability",
    newOnly: "New arrivals only",
    allSneakers: "All sneakers",
    clear: "Clear filters",
    clearWithCount: "Clear filters ({{total}})",
  },

  product: {
    breadcrumb: "Breadcrumb",
    notRated: "Not yet rated",
    ratedSr: "Rated",
    outOf5Sr: "out of 5",
    new: "New",
    soldOut: "Sold out",
    soldOutNotice: "Sold out. Save it to your wishlist to find it again.",
    sizeLegend: "Size (EU)",
    sizeRequired: "Select a size to add this pair to your bag.",
    sizeAria: "EU size {{size}}",
    sizeUnavailable: ", unavailable",
    quantityLabel: "Quantity for {{title}}",
    inStock: "In stock",
    stockLeft_zero: "No pairs left",
    stockLeft_one: "Only 1 left",
    stockLeft_two: "Only 2 left",
    stockLeft_few: "Only {{count}} left",
    stockLeft_many: "Only {{count}} left",
    stockLeft_other: "Only {{count}} left",
    addToBag: "Add to bag",
    save: "Save",
    saved: "Saved",
    wishlistAdd: "Add to wishlist",
    wishlistRemove: "Remove from wishlist",
    addedToBag: "Added {{quantity}} x size {{size}} to your bag.",
    viewBag: "View bag",
    shippingTitle: "Shipping",
    shippingText: "Free standard shipping over {{amount}}.",
    returnsTitle: "Returns",
    returnsText: "Thirty days, unworn.",
    loading: "Loading product",
    notFoundTitle: "We could not find that sneaker",
    notFoundText: "It may have been removed, or the link is incorrect.",
    browseAll: "Browse all sneakers",
    galleryAlt: "{{title}}, view {{index}} of {{total}}",
    galleryView: "Show view {{index}} of {{total}}",
  },

  quantity: {
    decrease: "Decrease quantity",
    increase: "Increase quantity",
  },

  card: {
    quickAdd: "Quick add {{title}}",
    closePicker: "Close size picker for {{title}}",
    addedSize: "Added size {{size}} to bag",
    chooseSize: "Choose a size for {{title}}",
    addSize: "Add size {{size}} to bag",
    wishlistAdd: "Add {{title}} to wishlist",
    wishlistRemove: "Remove {{title}} from wishlist",
    statusAdded: "Added {{title}}, size {{size}}, to your bag.",
  },

  bag: {
    title: "Bag",
    itemCount_zero: "No items",
    itemCount_one: "1 item",
    itemCount_two: "2 items",
    itemCount_few: "{{count}} items",
    itemCount_many: "{{count}} items",
    itemCount_other: "{{count}} items",
    empty: "Your bag is empty",
    emptyText: "Add a pair and it will wait here, even if you close the tab.",
    emptyButton: "Shop sneakers",
    clear: "Empty bag",
    itemsAria: "Items in your bag",
    checkout: "Continue to checkout",
    keepShopping: "Keep shopping",
    summaryTitle: "Order summary",
    freeAdd: "Add {{amount}} more for free standard shipping.",
    freeReached: "You qualify for free standard shipping.",
    subtotal_zero: "Subtotal (no items)",
    subtotal_one: "Subtotal (1 item)",
    subtotal_two: "Subtotal (2 items)",
    subtotal_few: "Subtotal ({{count}} items)",
    subtotal_many: "Subtotal ({{count}} items)",
    subtotal_other: "Subtotal ({{count}} items)",
    shipping: "Shipping",
    free: "Free",
    tax: "Estimated tax",
    total: "Total",
    quantityLabel: "Quantity for {{title}}, size {{size}}",
    maximum: "Maximum for this pair",
    remove: "Remove {{title}}, size {{size}}, from bag",
    removeLabel: "Remove",
  },

  wishlist: {
    title: "Wishlist",
    saved_zero: "No saved pairs",
    saved_one: "1 saved pair",
    saved_two: "2 saved pairs",
    saved_few: "{{count}} saved pairs",
    saved_many: "{{count}} saved pairs",
    saved_other: "{{count}} saved pairs",
    clear: "Clear wishlist",
    empty: "Your wishlist is empty",
    emptyText: "Tap the heart on any sneaker to save it here.",
    browse: "Browse sneakers",
  },

  auth: {
    loginTitle: "Log in",
    signupTitle: "Create account",
    accountTitle: "Account",
    name: "Full name",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    remember: "Remember me on this device",
    terms: "I agree to the terms: this account is stored only in this browser.",
    signIn: "Sign in",
    signingIn: "Signing in...",
    fixErrors: "Fix the highlighted fields to continue.",
    createAccount: "Create account",
    creatingAccount: "Creating account...",
    newToVelo: "New to VELO? Create an account",
    haveAccount: "Already have an account? Log in",
    accountDeleted: "Your account has been deleted.",
    tooManyAttempts: "Too many failed attempts. Try again in {{seconds}} seconds.",
    greeting: "Hello, {{name}}",
    memberSince: "Member since",
    logOut: "Log out",
    deleteAccount: "Delete account",
    deleteTitle: "Delete your account?",
    deleteText:
      "This removes the account and signs you out of this browser. Your bag and wishlist stay.",
    deleteConfirm: "Yes, delete it",
    deleting: "Deleting...",
    cancel: "Cancel",
    passwordRules: "Password requirements",
    ruleLength: "8 to 64 characters",
    ruleNoSpace: "No spaces",
    ruleLowercase: "A lowercase letter",
    ruleUppercase: "An uppercase letter",
    ruleDigit: "A number",
    ruleSymbol: "A symbol, like ! ? @ #",
    ruleEmail: "Does not contain your email address",
    ruleCommon: "Not a common password",
    ruleMet: "Met",
    ruleNotMet: "Not met",
    strength: "Strength",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
  },

  authError: {
    invalidCredentials: "Incorrect email or password.",
    emailTaken: "An account with this email already exists.",
    locked: "Too many failed attempts. Try again shortly.",
    cryptoUnavailable:
      "Secure password hashing is not available here, so accounts cannot be used in this browser.",
    storageUnavailable:
      "This browser blocked local storage, so the account could not be saved.",
    unknown: "Something went wrong. Try again.",
  },

  checkout: {
    title: "Checkout",
    contact: "Contact",
    fullName: "Full name",
    email: "Email",
    phone: "Phone",
    addressSection: "Delivery address",
    street: "Street address",
    city: "City",
    postal: "Postal code",
    country: "Country",
    chooseCountry: "Choose a country",
    shippingSection: "Shipping method",
    standard: "Standard",
    standardDetail: "3 to 5 business days",
    express: "Express",
    expressDetail: "1 to 2 business days",
    free: "Free",
    terms: "I understand that nothing will be charged or shipped.",
    fixErrors: "Fix the highlighted fields to place your order.",
    placeOrder: "Place order",
    yourOrder: "Your order",
    orderItemsAria: "Items in your order",
    editBag: "Edit bag",
    emptyTitle: "Your bag is empty",
    emptyText: "Add a pair before checking out.",
    emptyButton: "Shop sneakers",
  },

  order: {
    title: "Order placed",
    thanks:
      "Thanks, {{name}}. Nothing was charged and nothing will ship.",
    number: "Order number",
    placed: "Placed",
    delivery: "Delivery",
    items: "Items",
    byBrand: "by {{brand}}",
    quantityLine: "EU size {{size}}, quantity {{quantity}}",
    continueShopping: "Continue shopping",
    totalTitle: "Order total",
    noOrder: "No recent order",
    noOrderText: "Place an order and its confirmation will appear here.",
    standardShipping: "Standard shipping",
    expressShipping: "Express shipping",
  },

  about: {
    title: "About",
    lead: "VELO is a portfolio storefront built on real sneaker data.",
    p1: "The idea is simple: sneaker shopping should feel calm, quick and honest. Every pair on the shelf is real — the photos, prices and sizes come straight from the source stores — and the journey from browsing to order confirmation stays easy to follow.",
    p2: "The rest is deliberately quiet: no noise, no clutter, no pressure. Just the colourways, the size runs and the details you need to find your pair.",
  },

  notFound: {
    title: "Page not found",
    text: "The page you tried to open does not exist or has moved.",
    back: "Back to home",
  },

  error: {
    title: "Something went wrong",
    loadFailed: "Products could not be loaded.",
    boundaryTitle: "This page failed to load",
    boundaryText: "An unexpected error occurred. Reload the page to try again.",
  },

  loading: {
    sneakers: "Loading sneakers",
    product: "Loading product",
  },

  notices: {
    remoteUnavailable: "Live catalog unavailable ({{detail}}). Showing the built-in catalog.",
    skipped_zero: "No products were skipped from the live catalog.",
    skipped_one:
      "One product from the live catalog was skipped because the data was incomplete.",
    skipped_two:
      "2 products from the live catalog were skipped because the data was incomplete.",
    skipped_few:
      "{{count}} products from the live catalog were skipped because the data was incomplete.",
    skipped_many:
      "{{count}} products from the live catalog were skipped because the data was incomplete.",
    skipped_other:
      "{{count}} products from the live catalog were skipped because the data was incomplete.",
  },

  theme: {
    toLight: "Switch to light mode",
    toDark: "Switch to dark mode",
  },

  language: {
    switchToArabic: "Switch to Arabic",
    switchToEnglish: "Switch to English",
    arabic: "العربية",
    english: "English",
  },

  validation: {
    emailRequired: "Enter your email address.",
    emailFormat: "Enter an email like name@example.com.",
    nameRequired: "Enter your full name.",
    nameShort: "Full name must be at least 2 characters.",
    phoneRequired: "Enter a phone number for delivery updates.",
    phoneDigits: "Enter a phone number with 7 to 15 digits.",
    addressShort: "Enter your street address (at least 5 characters).",
    cityRequired: "Enter your city.",
    postalRequired: "Enter your postal code.",
    postalFormat: "Postal code must be 3 to 10 letters, numbers, spaces or hyphens.",
    countryRequired: "Choose a country.",
    shippingRequired: "Choose a shipping method.",
    termsRequired: "Confirm that you understand nothing will be charged or shipped.",
    nameFormat: "Use letters, spaces and ' - . only (2 to 50 characters).",
    emailTaken: "This email is already registered. Log in instead.",
    passwordRequired: "Enter your password.",
    passwordLength: "Use 8 to 64 characters.",
    passwordNoSpace: "Spaces are not allowed in the password.",
    passwordLowercase: "Add a lowercase letter.",
    passwordUppercase: "Add an uppercase letter.",
    passwordDigit: "Add a number.",
    passwordSymbol: "Add a symbol, for example ! ? @ #.",
    passwordContainsEmail: "The password must not contain your email address.",
    passwordCommon: "This password is too common. Choose another.",
    confirmRequired: "Repeat the password.",
    confirmMismatch: "The passwords do not match.",
    authTerms: "Accept the terms to create an account.",
  },
} as const;

export default en;

/** The shape every locale must provide. Values are widened to `string`. */
export type TranslationResource = {
  [Section in keyof typeof en]: {
    [Key in keyof (typeof en)[Section]]: string;
  };
};
