import { CheckCircle, Circle } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { passwordChecklist, passwordStrength } from "../../utils/authValidation";

type PasswordFeedbackProps = {
  /** Id of the checklist region, wired to the input's aria-describedby. */
  id: string;
  value: string;
  email: string;
};

/** 0-1 weak, 2 fair, 3 good, 4 strong. */
function strengthLabelKey(score: number) {
  if (score <= 1) return "auth.strengthWeak" as const;
  if (score === 2) return "auth.strengthFair" as const;
  if (score === 3) return "auth.strengthGood" as const;
  return "auth.strengthStrong" as const;
}

/**
 * Live requirement checklist plus a simple 4-segment strength meter.
 * Requirements are communicated by icon shape AND screen-reader words, never
 * by colour alone; the meter uses only brand-token surfaces.
 */
export default function PasswordFeedback({ id, value, email }: PasswordFeedbackProps) {
  const { t } = useTranslation();
  const items = useMemo(() => passwordChecklist(value, email), [value, email]);
  const score = useMemo(() => passwordStrength(value, email), [value, email]);

  return (
    <div className="mt-2">
      <p className="text-sm font-semibold">{t("auth.passwordRules")}</p>
      <ul id={id} aria-live="polite" className="mt-1.5 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-1.5 text-sm">
            {item.met ? (
              <CheckCircle className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-graphite" aria-hidden="true" />
            )}
            <span className={item.met ? undefined : "text-graphite"}>
              <span className="sr-only">
                {item.met ? `${t("auth.ruleMet")}: ` : `${t("auth.ruleNotMet")}: `}
              </span>
              {t(item.label)}
            </span>
          </li>
        ))}
      </ul>

      {value !== "" ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1.5 w-8 rounded-full ${index < score ? "bg-brand" : "bg-chalk"}`}
              />
            ))}
          </div>
          <p className="text-sm text-graphite">
            {t("auth.strength")}:{" "}
            <span className="font-semibold text-ink">{t(strengthLabelKey(score))}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
