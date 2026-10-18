import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "../../i18n";
import ErrorState from "./ErrorState";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24">
          <ErrorState
            // A class component cannot use hooks; the shared instance keeps
            // the copy translated to whatever language is active.
            title={i18n.t("error.boundaryTitle")}
            message={i18n.t("error.boundaryText")}
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
