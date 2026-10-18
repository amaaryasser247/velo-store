import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { EASE } from "../../lib/motion";

type ProductGalleryProps = {
  images: readonly string[];
  title: string;
};

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  const imageRef = useRef<HTMLImageElement>(null);
  const lastIndex = useRef(index);

  // View changes crossfade softly. The very first paint is left to the
  // product page's entrance sequence.
  useGSAP(
    () => {
      const changed = lastIndex.current !== index;
      lastIndex.current = index;
      const img = imageRef.current;
      if (!changed || !img || prefersReducedMotion()) return;
      gsap.fromTo(
        img,
        { opacity: 0.3, scale: 1.015 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: EASE.micro,
          overwrite: true,
          clearProps: "opacity,transform",
        },
      );
    },
    { dependencies: [index], scope: imageRef },
  );

  return (
    <div>
      <div className="aspect-[8/5] overflow-hidden bg-plate">
        {current ? (
          <img
            ref={imageRef}
            src={current}
            alt={t("product.galleryAlt", {
              title,
              index: index + 1,
              total: images.length,
            })}
            className="h-full w-full object-cover mix-blend-multiply"
          />
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="mt-3 grid grid-cols-3 gap-3">
          {images.map((image, imageIndex) => (
            <li key={imageIndex}>
              <button
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={t("product.galleryView", {
                  index: imageIndex + 1,
                  total: images.length,
                })}
                aria-pressed={imageIndex === index}
                className={`block aspect-[8/5] w-full overflow-hidden bg-plate outline-offset-2 ${
                  imageIndex === index ? "ring-2 ring-brand" : "opacity-70 hover:opacity-100"
                }`}
              >
                <img src={image} alt="" className="h-full w-full object-cover mix-blend-multiply" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
