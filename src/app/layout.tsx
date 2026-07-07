import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const amazonDisplay = localFont({
  src: [
    {
      path: "../../public/Fonts/AmazonEmberDisplay_Rg.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/Fonts/AmazonEmberDisplay_Bd.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-display",
  display: "swap",
});

const amazonMono = localFont({
  src: [
    {
      path: "../../public/Fonts/AmazonEmberMono_Bd.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ember-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Task Tracker — AWS Student Builder Group",
  description:
    "An AI-powered to-do list built with Amazon Bedrock. Chat in natural language or check tasks off directly.",
  icons: {
    icon: "/AWS Student Builder Group_RGB_Program Icon_Blue.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${amazonDisplay.variable} ${amazonMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
