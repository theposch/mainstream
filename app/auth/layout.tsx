export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Remove default padding from main element for auth pages
  return (
    <div className="fixed inset-0 overflow-auto">
      {children}
    </div>
  )
}

