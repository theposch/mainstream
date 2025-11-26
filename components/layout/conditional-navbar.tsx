"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"

export function ConditionalNavbar() {
  const pathname = usePathname()
  
  // Hide navbar on auth pages
  if (pathname?.startsWith("/auth")) {
    return null
  }
  
  return <Navbar />
}

