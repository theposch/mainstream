import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  // Redirect to login if not authenticated
  if (!user) {
    redirect("/auth/login");
  }
  
  // Redirect to home if not admin/owner
  if (!user.platformRole || !['admin', 'owner'].includes(user.platformRole)) {
    redirect("/home");
  }

  return <>{children}</>;
}

