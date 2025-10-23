const FALLBACK_NAME = "Simpul Chat";
const FALLBACK_TAGLINE = "Software Engineer assessment for Simpul Technologies";

const envName = import.meta.env.VITE_APP_NAME ?? FALLBACK_NAME;
const envTagline = import.meta.env.VITE_APP_TAGLINE ?? FALLBACK_TAGLINE;

export const BRAND_NAME = envName;
export const BRAND_TAGLINE = envTagline;
export const BRAND_AUTHOR = {
  name: "Zaid Yasyaf",
  website: "https://uncle-z.com",
  github: "https://github.com/zaidysf",
};
