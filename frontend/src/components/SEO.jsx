import { useEffect } from 'react';

const SEO = ({ title, description, keywords }) => {
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
    if (ogTitle) ogTitle.content = title ? `${title} | Meena Cards` : 'Meena Cards | Premium Wedding Invitations in Madurai';

    // OG Description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = description || 'Meena Cards specializes in exquisite handcrafted wedding invitations in Madurai.';

  }, [title, description, keywords]);

  return null;
};

export default SEO;
