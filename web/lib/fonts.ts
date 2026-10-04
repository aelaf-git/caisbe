import localFont from "next/font/local";

/** Self-hosted fonts so Docker/Render builds do not fetch Google Fonts. */

export const roboto = localFont({
  src: "../../fonts/roboto-latin-wght-normal.woff2",
  variable: "--font-roboto",
  weight: "100 900",
  display: "swap",
});

export const openSans = localFont({
  src: "../../fonts/open-sans-latin-wght-normal.woff2",
  variable: "--font-open-sans",
  weight: "300 800",
  display: "swap",
});

export const poppins = localFont({
  src: [
    { path: "../../fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const nunito = localFont({
  src: "../../fonts/nunito-sans-latin-wght-normal.woff2",
  variable: "--font-nunito",
  weight: "200 1000",
  display: "swap",
});

export const siteFontClassName = [
  roboto.variable,
  openSans.variable,
  poppins.variable,
  nunito.variable,
].join(" ");
