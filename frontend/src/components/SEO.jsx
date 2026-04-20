import { useEffect } from 'react';

const SEO = ({ title, description, keywords, jsonLd, image, url }) => {
  useEffect(() => {
    const finalTitle = title ? `${title} | Meena Cards` : 'Meena Cards | Premium Wedding Invitations in Madurai';
    document.title = finalTitle;
    
    const setMeta = (selector, attr, content) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('property')) element.setAttribute('property', attr);
        else element.name = attr;
        document.head.appendChild(element);
      }
      element.content = content;
    };

    setMeta('meta[name="description"]', 'description', description || 'Exquisite handcrafted wedding invitations in Madurai.');
    setMeta('meta[name="keywords"]', 'keywords', keywords || 'wedding cards madurai, meena cards');
    setMeta('meta[property="og:title"]', 'og:title', finalTitle);
    setMeta('meta[property="og:description"]', 'og:description', description || 'Exquisite handcrafted wedding invitations in Madurai.');
    setMeta('meta[property="og:type"]', 'og:type', 'product');
    if (image) setMeta('meta[property="og:image"]', 'og:image', image);
    if (url) setMeta('meta[property="og:url"]', 'og:url', url);

    // Twitter Tags
    setMeta('meta[name="twitter:card"]', 'twitter:card', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', 'twitter:title', finalTitle);
    setMeta('meta[name="twitter:description"]', 'twitter:description', description);
    if (image) setMeta('meta[name="twitter:image"]', 'twitter:image', image);

    if (jsonLd) {
      let script = document.querySelector('script[type="application/ld+json"]');
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.innerHTML = JSON.stringify(jsonLd);
    }

    return () => {
      if (jsonLd) {
        let script = document.querySelector('script[type="application/ld+json"]');
        if (script) script.remove();
      }
    };
  }, [title, description, keywords, jsonLd, image, url]);

  return null;
};

export default SEO;
