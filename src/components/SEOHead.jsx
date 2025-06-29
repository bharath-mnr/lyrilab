// src/components/SEOHead.jsx
import { Helmet } from 'react-helmet-async';
import { getSEOData, generateMusicToolStructuredData } from '../config/seo.js'; // Ensure correct path

const SEOHead = ({ pageId, tool = null, customData = {} }) => {
  // Fetch SEO data based on the provided pageId
  const seoData = getSEOData(pageId);

  // Merge base SEO data with any custom data passed to the component
  // Custom data will override default seoData for specific fields if provided
  const finalData = { ...seoData, ...customData };

  // Generate structured data only if a 'tool' object is explicitly provided
  // This ensures structured data is only added to actual tool pages
  const structuredData = tool ? generateMusicToolStructuredData(tool, finalData) : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalData.fullTitle}</title> {/* The primary title for the browser tab and search results */}
      <meta name="description" content={finalData.description} /> {/* Concise summary for search engines */}
      <meta name="keywords" content={finalData.keywords} /> {/* Important keywords for the page */}
      <meta name="author" content={finalData.author} /> {/* Your site's author */}
      <link rel="canonical" href={finalData.ogUrl} /> {/* Consolidates duplicate content to a preferred URL */}

      {/* Open Graph Tags (for social media sharing) */}
      <meta property="og:title" content={finalData.ogTitle} />
      <meta property="og:description" content={finalData.ogDescription} />
      <meta property="og:image" content={finalData.ogImage} />
      <meta property="og:url" content={finalData.ogUrl} /> {/* Consistent with canonical for social sharing */}
      <meta property="og:type" content={finalData.type} /> {/* e.g., "website", "article", "SoftwareApplication" */}
      <meta property="og:site_name" content={finalData.siteName} />
      <meta property="og:locale" content={finalData.locale} />

      {/* Twitter Card Tags (for Twitter sharing) */}
      <meta name="twitter:card" content="summary_large_image" /> {/* "summary_large_image" is generally preferred for rich previews */}
      <meta name="twitter:site" content={finalData.twitterHandle} /> {/* Your Twitter handle */}
      <meta name="twitter:title" content={finalData.ogTitle} />
      <meta name="twitter:description" content={finalData.ogDescription} />
      <meta name="twitter:image" content={finalData.ogImage} />

      {/* Additional Meta Tags */}
      <meta name="robots" content="index, follow" /> {/* Instructs search engines to crawl and index the page */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" /> {/* Responsive design declaration */}
      <meta httpEquiv="Content-Language" content="en" /> {/* Declares the primary language of the document */}

      {/* Structured Data (Schema.org JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Preconnect for performance: Helps browsers establish early connections to important third-party origins */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
      {/* Add other preconnects if you load external scripts, analytics, or APIs */}
    </Helmet>
  );
};

export default SEOHead;

// Usage example in your components:
/*
import SEOHead from './components/SEOHead';
import { TOOLS } from './config/tools';

const VirtualPiano = () => {
  const tool = TOOLS.find(t => t.id === 'virtual-piano');
  
  return (
    <>
      <SEOHead pageId="virtual-piano" tool={tool} />
      <div>
        Your Virtual Piano Component
      </div>
    </>
  );
};
*/
