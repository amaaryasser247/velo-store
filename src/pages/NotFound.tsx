import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFound() {
  const { t } = useTranslation();
  useDocumentTitle(t("meta.notFound"));

  return (
    <Container className="py-12 sm:py-20">
      <EmptyState
        title={t("notFound.title")}
        description={t("notFound.text")}
        action={<ButtonLink to="/">{t("notFound.back")}</ButtonLink>}
      />
    </Container>
  );
}
