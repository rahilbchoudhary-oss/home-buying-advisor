import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Buying Advisor — Find the right AC",
  description: "Personalized AC buying recommendations based on your room, usage, budget and priorities."
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}