import type { ImageMetadata } from "astro";
import kobbeImage from "@/images/ad/kobbe.png";
import lexadImage from "@/images/ad/lexad.png";

const utm =
  "utm_source=Bearnie&utm_medium=click&utm_campaign=Bearnie+Ad&utm_content=sidebar-ad";

export interface SidebarAd {
  href: string;
  image: ImageMetadata;
  alt: string;
}

export const sidebarAds: SidebarAd[] = [
  {
    href: `https://kobbe.io/?${utm}`,
    image: kobbeImage,
    alt: "Kobbe, privacy-first analytics",
  },
  {
    href: `https://lexingtonthemes.com/?${utm}`,
    image: lexadImage,
    alt: "Lexington Themes, premium Astro and Tailwind CSS themes",
  },
];
