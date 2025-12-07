import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { LoadingSpinner } from "@/components/ui/loading"

export default function LoginPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Suspense fallback={<LoadingSpinner />}>
        <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
