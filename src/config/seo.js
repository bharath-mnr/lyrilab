// src/config/seo.js
export const SEO_CONFIG = {
  // Global defaults
  global: {
    siteName: "LiriLab",
    domain: "http://localhost:3000",
    twitterHandle: "...",
    locale: "en_US",
    type: "website",
    author: "Bharath"
  },

  pages: {
    'virtual-piano': {
      title: "Virtual Piano - Online Piano Keyboard | LiriLab",
      description: "Play a full-featured virtual piano with realistic sounds. Perfect for composing melodies, learning piano, and music practice. Works with computer keyboard and mouse.",
      keywords: "virtual piano, online piano, piano keyboard, digital piano, piano practice, music composition, learn piano online, virtual instrument, music education",
      image: "/images/og-piano.jpg",
      canonical: "/virtual-piano"
    }
    // ... other pages
  }
};

// Helper function to get SEO data for a specific page
export const getSEOData = (pageId) => {
  console.log('getSEOData called with pageId:', pageId);
  
  const pageData = SEO_CONFIG.pages[pageId];
  const global = SEO_CONFIG.global;
  
  console.log('Found pageData:', pageData);
  
  if (!pageData) {
    console.warn(`No SEO data found for pageId: ${pageId}`);
    return {
      title: `${global.siteName} - Music Tools & Sound Design`,
      description: "Interactive music tools for learning and creating music.",
      keywords: "music tools, sound design, music education",
      image: "/images/og-default.jpg",
      canonical: "/",
      ...global
    };
  }

  const result = {
    ...pageData,
    fullTitle: pageData.title,
    ogTitle: pageData.title,
    ogDescription: pageData.description,
    ogImage: `${global.domain}${pageData.image}`,
    ogUrl: `${global.domain}${pageData.canonical}`,
    ...global
  };
  
  console.log('getSEOData returning:', result);
  return result;
};

export const generateMusicToolStructuredData = (tool, seoData) => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.name,
    "description": tool.description,
    "url": `${SEO_CONFIG.global.domain}${tool.path}`,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": SEO_CONFIG.global.siteName
    },
    "featureList": tool.categories
  };
};