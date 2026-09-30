"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/Toast";

import { CartProvider } from "./CartProvider";
import { MiniCart } from "./MiniCart";

export function ShopProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        {children}
        <MiniCart />
      </CartProvider>
    </ToastProvider>
  );
}
