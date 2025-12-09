"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Hide navbar on auth pages and landing page (which has its own navbar)
  if (pathname?.startsWith("/auth") || pathname === "/") {
    return null
  }
  
  return <Navbar />
}
