import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AdminErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AdminErrorBoundary] caught:", error, info.componentStack);

    // Stale chunk after a new deploy — reload once to get fresh asset hashes
    const isChunkError =
      error.message.includes("dynamically imported module") ||
      error.message.includes("Failed to fetch");
    if (isChunkError) {
      const reloadKey = "pg_chunk_reload";
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      }
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <p className="text-destructive font-mono text-sm font-semibold">
          Page crashed — {error.message}
        </p>
        <pre className="text-xs text-muted-foreground max-w-xl overflow-auto whitespace-pre-wrap bg-muted/40 rounded p-3">
          {error.stack}
        </pre>
        <Button
          size="sm"
          variant="outline"
          onClick={() => this.setState({ error: null })}
        >
          Retry
        </Button>
      </div>
    );
  }
}
