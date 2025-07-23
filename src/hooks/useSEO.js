// src/hooks/useSEO.js - SEO Manager Hook
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSEOData, generateMusicToolStructuredData } from '../config/seo';

export const useSEO = (pageId, toolData = null) => {
  const location = useLocation();
  
  useEffect(() => {
    const seoData = getSEOData(pageId);
    
    // Update document title
    document.title = seoData.fullTitle || seoData.title;
    
    // Function to update or create meta tag
    const updateMetaTag = (name, content, property = false) => {
      if (!content) return;
      
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let metaTag = document.querySelector(selector);
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (property) {
          metaTag.setAttribute('property', name);
        } else {
          metaTag.setAttribute('name', name);
        }
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', content);
    };
    
    // Function to update or create link tag
    const updateLinkTag = (rel, href) => {
      if (!href) return;
      
      let linkTag = document.querySelector(`link[rel="${rel}"]`);
      
      if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.setAttribute('rel', rel);
        document.head.appendChild(linkTag);
      }
      
      linkTag.setAttribute('href', href);
    };
    
    // Standard meta tags
    updateMetaTag('description', seoData.description);
    updateMetaTag('keywords', seoData.keywords);
    updateMetaTag('author', seoData.author);
    updateMetaTag('robots', 'index, follow');
    updateMetaTag('language', 'English');
    updateMetaTag('revisit-after', '7 days');
    
    // Open Graph tags
    updateMetaTag('og:title', seoData.ogTitle || seoData.title, true);
    updateMetaTag('og:description', seoData.ogDescription || seoData.description, true);
    updateMetaTag('og:image', seoData.ogImage, true);
    updateMetaTag('og:url', seoData.ogUrl, true);
    updateMetaTag('og:type', seoData.type || 'website', true);
    updateMetaTag('og:site_name', seoData.siteName, true);
    updateMetaTag('og:locale', seoData.locale, true);
    
    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:site', seoData.twitterHandle);
    updateMetaTag('twitter:creator', seoData.twitterHandle);
    updateMetaTag('twitter:title', seoData.title);
    updateMetaTag('twitter:description', seoData.description);
    updateMetaTag('twitter:image', seoData.ogImage);
    
    // Canonical URL
    updateLinkTag('canonical', `${seoData.domain}${seoData.canonical}`);
    
    // Structured Data for music tools
    if (toolData) {
      const structuredData = generateMusicToolStructuredData(toolData, seoData);
      
      // Remove existing structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
    
    // Clean up function to remove meta tags when component unmounts (optional)
    return () => {
      // You can implement cleanup if needed
    };
  }, [pageId, location.pathname, toolData]);
  
  return getSEOData(pageId);
};