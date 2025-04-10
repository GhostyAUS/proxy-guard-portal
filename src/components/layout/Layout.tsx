
import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useMediaQuery } from "@/hooks/use-mobile";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className={isMobile ? "hidden" : "w-64 border-r"} />
      
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
