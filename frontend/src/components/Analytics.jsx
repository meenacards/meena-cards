import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const Analytics = () => {
  const location = useLocation();
  const TRACKING_ID = import.meta.env.VITE_GA_TRACKING_ID;

  useEffect(() => {
    // We only load and execute GA4 if a tracking ID is explicitly provided
    if (!TRACKING_ID) return;

    // Dynamically inject the Google Analytics snippet into the head if it doesn't exist
    if (!document.getElementById('ga-script')) {
      const script = document.createElement('script');
      script.id = 'ga-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${TRACKING_ID}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function() { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
    }

    // Ping the backend explicitly every time React Router updates the page path
    if (window.gtag) {
      window.gtag('config', TRACKING_ID, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location, TRACKING_ID]);

  // Headless background component
  return null;
};

export default Analytics;
