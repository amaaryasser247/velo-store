import { useTranslation } from "react-i18next";

type LoadingStateProps = {
  label?: string;
  count?: number;
};

export default function LoadingState({ label, count = 8 }: LoadingStateProps) {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label ?? t("loading.sneakers")}</span>
      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-[8/5] bg-plate" />
            <div className="mt-3 h-4 w-2/3 bg-chalk" />
            <div className="mt-2 h-4 w-1/3 bg-chalk" />
          </div>
        ))}
      </div>
    </div>
  );
}
