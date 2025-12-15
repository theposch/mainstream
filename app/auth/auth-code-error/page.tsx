import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Authentication Error
          </h1>
          <p className="text-muted-foreground">
            We couldn&apos;t complete the sign-in process. This can happen if the
            link has expired or was already used.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/auth/login">Try Again</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Go Home</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
}

