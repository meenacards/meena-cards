import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag } from 'lucide-react';
import './navbar.css';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery(''); // clear after search if desired
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
    <div style={{ height: '80px', flexShrink: 0 }}></div>
    <nav className="navbar" style={{ position: 'fixed', top: 0, width: '100%', left: 0 }}>
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/logo1.png" alt="Meena Cards Logo" className="logo-img" />
          <div className="logo-text-group">
            <span className="logo-text">MEENA CARDS</span>
            <span className="logo-trademark"><sup>®</sup></span>
          </div>
        </Link>
        
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Desktop Navigation */}
        <div className={`nav-wrapper ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-links">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/latest-arrivals" className={`nav-link ${location.pathname === '/latest-arrivals' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Latest Arrivals</Link>
              <Link to="/invitation" className={`nav-link ${location.pathname === '/invitation' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Invitation</Link>
              <Link to="/celebration-boutique" className={`nav-link ${location.pathname === '/celebration-boutique' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Celebration Boutique</Link>
              <Link to="/collections" className={`nav-link ${location.pathname === '/collections' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Catalogue</Link>
              <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>Contact</Link>
          </div>

          <div className="nav-actions">
            {!mobileMenuOpen && (
              <form className="nav-search" onSubmit={handleSearch}>
                <input 
                  type="text" 
                  placeholder="Search cards..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            )}
          </div>
        </div>

      </div>
    </nav>
    </>
  );
};

export default Navbar;
