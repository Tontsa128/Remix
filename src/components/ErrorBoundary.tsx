import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage:
        error?.message || "Näkymän latauksessa tapahtui odottamaton virhe.",
    };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Elovio ErrorBoundary caught:", error, info);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[#FAF9F6] px-4 py-8 text-[#142620]">
          <div className="w-full max-w-md rounded-2xl border border-[#D8E2DC] bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-bold text-[#142620]">
              Jokin meni pieleen
            </h1>
            <p className="mt-2 text-sm text-[#4A5D55]">
              Sovellus kohtasi virheen, mutta oppimistietosi ovat tallessa.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: "" });
              }}
              className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#1E3F35] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#17322A]"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
