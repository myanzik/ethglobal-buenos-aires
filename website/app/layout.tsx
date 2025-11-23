import type React from "react"
import type { Metadata } from "next"
import { Dela_Gothic_One, M_PLUS_Rounded_1c } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _delaGothicOne = Dela_Gothic_One({ weight: "400", subsets: ["latin"] })
const _mPlusRounded = M_PLUS_Rounded_1c({ weight: ["400", "700"], subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Githunder - Fight Bugs, Win Tokens",
  description:
    "Transform open source development with bounties. Funders add rewards to GitHub issues and contributors earn tokens for solving them.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${_mPlusRounded.className}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
