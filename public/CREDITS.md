# Data and image sources

This portfolio demo collects real product information and imagery at build time
via `scripts/fetch-catalog.ts`. Collection day of this snapshot: 2026-10-17.
Nothing is fetched at runtime; the app stores everything locally.

## adidas (www.adidas.com.eg)

- NOT collected this run: adidas' edge service (Akamai) served the collector an
  automated-security block page ("security issue was automatically identified").
  Per the no-circumvention rule, no further adidas requests were made; the
  script's adidas plumbing is kept intact and can be re-run later. No
  adidas-branded products are in this catalog snapshot.

## Nike (www.nike.com, German storefront)

- nike.com/eg has no browsable catalog (shop paths redirect to the /eg/
  homepage), so the default-store fallback applies. To keep ONE size system
  store-wide, the German storefront is used, because it lists EU sizes
  natively (the default en-us store labels sizes in US).
- What was collected: 14 men's sneaker product pages across the
  running, basketball, lifestyle, training and (Nike SB) skate listings.
  Title, style code,
  EUR price (converted to EGP with the fixed documented demo rate in the
  script: 1 EUR -> 52 EGP), colourway, available EU sizes, rating and images.
- Titles on the German store end with a localised category word
  ("Herrenschuh"); the generated data strips that suffix.
- Prices and availability are a snapshot from the collection day, not live.

## Skipped material

- 2 source entries were skipped (non-sneakers, missing prices or
  sizes, unusable or low-resolution images, sold-out pages). Exact reasons are
  printed by the script's run summary and kept in scripts/.cache/run-log.txt.

## Hero photograph

- The hero backdrop is Nike campaign photography ("Just Do It" series),
  shipped for demo purposes only. `scripts/build-hero.ts` crops and re-encodes
  it from `assets-src/hero/nike-just-do-it.jpg` into `public/images/hero/`;
  the copyright stays with Nike.

## Legal note

adidas and Nike product names, images and trademarks belong to their owners.
This project is a non-commercial portfolio demo and is not affiliated with or
endorsed by adidas or Nike. Review each source's terms before any commercial or
public deployment.
