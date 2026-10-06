// Banner sections an admin can upload to. Keep in sync with
// AICDA/src/lib/banner-sections.js (the key is stored in Gallery.title).
export const DEFAULT_MAX_BANNERS = 5;

export const BANNER_SECTION_LIMITS = {
  home: DEFAULT_MAX_BANNERS,
  "association-events": DEFAULT_MAX_BANNERS,
  "political-achievements": DEFAULT_MAX_BANNERS,
  image: DEFAULT_MAX_BANNERS,
  management: DEFAULT_MAX_BANNERS,
  directory: DEFAULT_MAX_BANNERS,
  letter: DEFAULT_MAX_BANNERS,
  "about-us": DEFAULT_MAX_BANNERS,
  "contact-us": DEFAULT_MAX_BANNERS,
  "become-member": DEFAULT_MAX_BANNERS,
};

export const isBannerSection = (key) =>
  Object.prototype.hasOwnProperty.call(BANNER_SECTION_LIMITS, key);
