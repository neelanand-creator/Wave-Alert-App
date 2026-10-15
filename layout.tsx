import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuakeGuard — Live Earthquake Monitor",
  description: "Monitor recent earthquakes within 100 km and ask QuakeGuard earthquake-related questions.",
  applicationName: "QuakeGuard",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
