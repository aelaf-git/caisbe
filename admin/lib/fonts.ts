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

export const inter = localFont({
  src: "../../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const sourceSans = localFont({
  src: "../../fonts/source-sans-3-latin-wght-normal.woff2",
  variable: "--font-source-sans",
  weight: "200 900",
  display: "swap",
});

export const merriweather = localFont({
  src: "../../fonts/merriweather-latin-wght-normal.woff2",
  variable: "--font-merriweather",
  weight: "300 900",
  display: "swap",
});

export const sourceSerif = localFont({
  src: "../../fonts/source-serif-4-latin-wght-normal.woff2",
  variable: "--font-source-serif",
  weight: "200 900",
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

export const cinzel = localFont({
  src: [
    { path: "../../fonts/cinzel-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/cinzel-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-cinzel",
  display: "swap",
});

export const greatVibes = localFont({
  src: "../../fonts/great-vibes-latin-400-normal.woff2",
  variable: "--font-great-vibes",
  weight: "400",
  display: "swap",
});

export const appearanceFontClassName = [
  roboto.variable,
  openSans.variable,
  inter.variable,
  sourceSans.variable,
  merriweather.variable,
  sourceSerif.variable,
  poppins.variable,
  nunito.variable,
  cinzel.variable,
  greatVibes.variable,
].join(" ");
