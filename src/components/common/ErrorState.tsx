import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export default function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="border border-danger px-6 py-12 text-center sm:py-16">
      <h2 className="type-title flex items-center justify-center gap-2 text-2xl text-danger">
        <AlertTriangle className="size-6 shrink-0" aria-hidden="true" />
        {title ?? t("error.title")}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-graphite">{message}</p>
      {onRetry ? (
        <Button className="mt-6" onClick={onRetry}>
          {t("common.tryAgain")}
        </Button>
      ) : null}
    </div>
  );
}
