import { useEffect } from 'react';

const SEO = ({ title, description, keywords, jsonLd }) => {
  useEffect(() => {
    // Set Title
    if (title) {
      document.title = `${title} | Meena Cards`;
    } else {
      document.title = 'Meena Cards | Premium Wedding Invitations in Madurai';
    }
    
    // Set Description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.name = "description";
      document.head.appendChild(metaDescription);
    }
    metaDescription.content = description || 'Meena Cards specializes in exquisite handcrafted wedding invitations in Madurai, offering premium designs that blend perfection with tradition.';

    // Set Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords || 'wedding cards madurai, meena cards, luxury wedding invitations, custom wedding cards, premium invitations, tamil wedding cards';

    // OG Title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = title ? `${title} | Meena Cards` : 'Meena Cards | Premium Wedding Invitations in Madurai';

    // OG Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = description || 'Meena Cards specializes in exquisite handcrafted wedding invitations in Madurai.';

    // JSON-LD Structured Data
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
      // Cleanup json-ld on unmount if needed, though usually we replace it
      if (jsonLd) {
        let script = document.querySelector('script[type="application/ld+json"]');
        if (script) {
          script.remove();
        }
      }
    };
  }, [title, description, keywords, jsonLd]);

  return null;
};

export default SEO;
