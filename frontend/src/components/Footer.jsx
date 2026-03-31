import React, { useState, useEffect } from 'react';
import './footer.css';

import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Automatically updates the year if the computer rolls over to January 1st while tab is open
    const interval = setInterval(() => {
      setCurrentYear(new Date().getFullYear());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="new-footer">
      <div className="footer-layout">
        
        {/* Left - Vertical Links */}
        <div className="footer-col-nav">
          <a href="/" className="footer-nav-link">Home</a>
          <a href="/collections" className="footer-nav-link">Collections</a>
          <a href="/about" className="footer-nav-link">Who We Are</a>
          <a href="/contact" className="footer-nav-link">Contact Us</a>
        </div>

        {/* Center - Brand */}
        <div className="footer-brand">
          <h2>MEENA CARDS</h2>
          <p>Handcrafted invitations for the perfect occasion.</p>
        </div>

        {/* Right - Icons */}
        <div className="footer-icons">
          <a href="https://www.instagram.com/meena_cards?igsh=eXcweml1c2g0YThm" target="_blank" rel="noopener noreferrer"><Instagram size={20} /></a>
          <a href="mailto:meenacards.mdu@gmail.com"><Mail size={20} /></a>
          <a href="tel:04527964782"><Phone size={20} /></a>
          <a href="https://maps.google.com/?q=Meena+Cards+Madurai" target="_blank" rel="noopener noreferrer"><MapPin size={20} /></a>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© <span id="dynamic-auto-year">{currentYear}</span> Meena Cards. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
