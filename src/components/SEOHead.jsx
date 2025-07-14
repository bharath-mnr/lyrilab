// src/components/SEOHead.jsx
import { Helmet } from 'react-helmet-async';
import { getSEOData, generateMusicToolStructuredData } from '../config/seo.js';

const SEOHead = ({ pageId, tool = null, customData = {} }) => {
  const seoData = getSEOData(pageId);
  const finalData = { ...seoData, ...customData };

  // Debug logging
  console.log('SEO Debug - pageId:', pageId);
  console.log('SEO Debug - seoData:', seoData);
  console.log('SEO Debug - finalData:', finalData);
  console.log('SEO Debug - Description:', finalData.description);
  console.log('SEO Debug - Keywords:', finalData.keywords);

  // Generate structured data if tool is provided
  const structuredData = tool ? generateMusicToolStructuredData(tool, finalData) : null;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalData.fullTitle || finalData.title}</title>
      <meta name="description" content={finalData.description} />
      <meta name="keywords" content={finalData.keywords} />
      <meta name="author" content="Bharath" />
      
      {/* Debug: Add a test meta tag to verify Helmet is working */}
      <meta name="seo-debug" content="helmet-working" />
      
      <link rel="canonical" href={`${finalData.domain}${finalData.canonical}`} />

      {/* Enhanced Robot Meta Tags */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large" />
      <meta name="bingbot" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />

      {/* Open Graph Tags */}
      <meta property="og:title" content={finalData.ogTitle || finalData.title} />
      <meta property="og:description" content={finalData.ogDescription || finalData.description} />
      <meta property="og:image" content={finalData.ogImage} />
      <meta property="og:url" content={finalData.ogUrl} />
      <meta property="og:type" content={finalData.type} />
      <meta property="og:site_name" content={finalData.siteName} />
      <meta property="og:locale" content={finalData.locale} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={finalData.twitterHandle} />
      <meta name="twitter:title" content={finalData.ogTitle || finalData.title} />
      <meta name="twitter:description" content={finalData.ogDescription || finalData.description} />
      <meta name="twitter:image" content={finalData.ogImage} />

      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Language" content="en" />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
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

