import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Filter, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Collections = ({ filterCategory }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Revised 3-Level Structured Categories with Flat Board Sets
  const collectionTree = {
    "Cards Only": {
      "1x5 Folding card only": ["Rani Series", "Vani Series", "Famous Series", "Meena Series", "Nila Series", "1 Side 3D", "2 side 3D", "Cute Series", "B Series", "K Series"],
      "12x8 Folding card only": ["Queen Series", "Vel 3D 1 side", "Meena color", "Browny Series", "Riya Series", "Mari Series", "J Series"],
      "Single Card Only": ["WS Series", "AS Series", "9x7 Metallic foil card", "10x8 Metallic foil card", "11x8 ACE card", "12x8 A Series", "XL Series"],
      "Pouch Card Set": ["9x5 Single Color Pouch", "9x7 Single Color Pouch", "9x7 Folding Pouch Set", "9x6 Single Color Pouch lock set"],
      "3 Folding Card": ["Jio 3 Folding Set", "Buff 3 Folding Set", "Offset 3 Folding Set", "Pearl Lock Card", "Rang XL Lock Card", "Daya Lock Card", "Trends Lock Card", "Theri Lock Card"],
      "2 Folding Card": ["Anu lilly 3D card only", "Anu lilly 3D Set Card"]
    },
    "Card, Cover, Paper Sets": {
      "9x6 Folding Set Card": ["9x6 Offset Set Card", "9x6 Metallic Set Card", "9x6 Color Set Card"],
      "7x7 Folding set Card": ["7x7 Offset Set Card", "7x7 Metallic Set Card"],
      "8x8 Folding Set Card": ["8x8 Sri Set", "8x8 Metallic Set"],
      "11x7 Folding Set Card": ["11x7 Rasi set"],
      "10x8 Folding set Card": ["10x8 Sana Gold", "10x8 Color Set", "10x8 Metallic Set"],
      "12x8 Folding Set Card": ["12x8 Star Set", "12x8 Metallic Set", "12x8 paper set"]
    },
    "Card, Cover, Board Sets": [
      "8x8 ITC Board Set", 
      "10x8 Metallic ITC Board Set", 
      "12x8 Metallic ITC Board Set", 
      "12x8 Offset ITC Board Set"
    ],
    "V Cards": [],
    "K Cards": [],
    "R Cards": [],
    "ES Cards": [],
    "Friends Card": [],
    "Luxe Models": [],
    "Offer": []
  };


  const [activeMain, setActiveMain] = useState(filterCategory === "Luxe" ? "Luxe Models" : "Cards Only");
  const [activeSub, setActiveSub] = useState(filterCategory === "Luxe" ? "" : "1x5 Folding card only");
  const [activeSeries, setActiveSeries] = useState(filterCategory === "Luxe" ? "Luxe Models" : ""); // Start with empty to avoid initial show bug

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/cards`);
      if (response.data && response.data.length > 0) {
        setCards(response.data);
      } else {
        setCards(sampleCards);
      }
    } catch (error) {
      setCards(sampleCards);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic: Match either Category or Name against the active series tag
  const filteredCards = cards.filter(c => {
    if (!activeSeries) return false;

    // Helper: Normalize category to string for matching
    const matchesCategory = (categoryObj, target) => {
      if (!categoryObj) return false;
      const normalizedTarget = target.toLowerCase();
      
      if (Array.isArray(categoryObj)) {
        return categoryObj.some(cat => cat.toString().toLowerCase() === normalizedTarget);
      }
      return categoryObj.toString().toLowerCase() === normalizedTarget;
    };

    // Helper: Check if any category contains target (for V Cards)
    const categoryIncludes = (categoryObj, targets) => {
      if (!categoryObj) return false;
      const cats = Array.isArray(categoryObj) ? categoryObj : [categoryObj];
      return cats.some(cat => targets.some(target => cat.toString().toLowerCase().includes(target.toLowerCase())));
    };

    if (activeMain === "Card, Cover, Board Sets") {
      return matchesCategory(c.category, activeSeries);
    }

    if (activeMain === "V Cards") {
      const vCardSeries = ['10x8 Board Set', '12x8 Board Set', 'V Cards'];
      return categoryIncludes(c.category, vCardSeries);
    }

    if (activeMain === "Offer" || activeSeries === "Offer") {
      return c.is_offer === true || c.is_offer === "true";
    }

    if (activeMain === "Luxe Models" || activeSeries === "Luxe Models") {
        return categoryIncludes(c.category, ['luxe']);
    }

    // Default matching: Matches category OR contains in name
    return matchesCategory(c.category, activeSeries) ||
           (c.name && c.name.toLowerCase().includes(activeSeries.toLowerCase()));
  }).sort((a,b) => a.name.localeCompare(b.name));


  const handleSubClick = (sub, main) => {
    setActiveSub(sub);
    setActiveSeries(collectionTree[main][sub][0]);
  };

  const handleMainClick = (main) => {
    setActiveMain(main);
    if (Array.isArray(collectionTree[main])) {
      setActiveSub("");
      if (collectionTree[main].length > 0) {
        setActiveSeries(collectionTree[main][0]);
      } else {
        setActiveSeries(main); // Empty category selects itself
      }
    } else {
      const firstSub = Object.keys(collectionTree[main])[0];
      setActiveSub(firstSub);
      setActiveSeries(collectionTree[main][firstSub][0]);
    }
  };

  const catalogRef = React.useRef(null);

  const handleSeriesClick = (ser) => {
    const newSeries = activeSeries === ser ? "" : ser;
    setActiveSeries(newSeries);
    
    // Auto-scroll to results on mobile after selection
    if (newSeries && window.innerWidth < 768) {
      setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="home-page animate-fade-in" style={{ padding: '60px 0' }}>
      <SEO 
        title="Exquisite Wedding Collections" 
        description="Browse the complete catalog of Meena Cards. Discover thousands of luxurious, handcrafted, and custom wedding invitations, from traditional to contemporary."
      />
      <section className="catalog container">
        <div className="section-header">
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <Layers className="gradient-text" style={{ color: 'var(--primary-color)' }} size={32} />
            <h2 style={{ margin: 0 }}>The Meena Catalogue</h2>
          </div>
          <p>Handcrafted series designed for every unique celebration</p>
        </div>

        <div className="collections-layout" style={{ 
          display: 'flex', 
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          gap: '30px', 
          marginTop: '50px' 
        }}>
          {/* Sidebar */}
          <aside className="collections-sidebar" style={{ 
            flex: window.innerWidth < 768 ? '1' : '0 0 320px', 
            background: '#fff', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '1px solid #eee' 
          }}>
            {Object.entries(collectionTree).map(([main, content]) => (
              <div key={main} style={{ marginBottom: '15px' }}>
                <div 
                  className={`main-nav-item ${activeMain === main ? 'active' : ''}`}
                  onClick={() => handleMainClick(main)}
                  style={{ 
                    padding: '14px 18px', 
                    background: activeMain === main ? 'var(--primary-color)' : '#fdfdfd',
                    color: activeMain === main ? '#fff' : '#444',
                    borderRadius: '8px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontWeight: '700',
                    boxShadow: activeMain === main ? '0 10px 20px var(--primary-glow)' : 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {main}
                  {(!Array.isArray(content) || content.length > 0) && (
                    activeMain === main ? <ChevronDown size={18} /> : <ChevronRight size={18} />
                  )}
                </div>

                {activeMain === main && (
                  <div className="sub-nav-wrapper" style={{ paddingLeft: '10px', marginTop: '8px' }}>
                    {Array.isArray(content) ? (
                      <div className="series-list" style={{ marginTop: '5px' }}>
                        {content.map(ser => (
                              <button 
                                key={ser}
                                onClick={() => handleSeriesClick(ser)}
                                style={{
                                  textAlign: 'left',
                                  width: '100%',
                                  padding: '10px 15px',
                                  fontSize: '0.9rem',
                                  borderRadius: '6px',
                                  background: activeSeries === ser ? '#FFF5F8' : 'none',
                                  color: activeSeries === ser ? 'var(--primary-color)' : '#666',
                                  fontWeight: activeSeries === ser ? '700' : '500',
                                  border: 'none',
                                  cursor: 'pointer',
                                  marginBottom: '4px'
                                }}
                              >
                                {ser}
                              </button>
                        ))}
                      </div>
                    ) : (
                      Object.entries(content).map(([sub, seriesList]) => (
                        <div key={sub}>
                          <div 
                            onClick={() => handleSubClick(sub, main)}
                            style={{
                              padding: '10px 15px',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: activeSub === sub ? 'var(--primary-color)' : '#666',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <ChevronRight size={14} style={{ opacity: 0.5 }} />
                            {sub}
                          </div>
                          {activeSub === sub && (
                            <div className="series-list" style={{ paddingLeft: '25px', display: 'flex', flexDirection: 'column', gap: '4px', margin: '5px 0 12px' }}>
                              {seriesList.map(ser => (
                                <button 
                                  key={ser}
                                  onClick={() => handleSeriesClick(ser)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '6px 12px',
                                    fontSize: '0.85rem',
                                    borderRadius: '4px',
                                    background: activeSeries === ser ? '#FFF5F8' : 'none',
                                    color: activeSeries === ser ? 'var(--primary-color)' : '#888',
                                    fontWeight: activeSeries === ser ? '700' : '400',
                                    borderLeft: activeSeries === ser ? '3px solid var(--primary-color)' : '3px solid transparent'
                                  }}
                                >
                                  {ser}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </aside>

          {/* Catalog View */}
          <div className="collections-content" ref={catalogRef} style={{ flex: 1, minHeight: '400px' }}>
            {activeSeries && (
              <div className="active-filter-badge" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <span style={{ fontSize: '0.9rem', color: '#999', fontWeight: 'bold' }}>Showing:</span>
                 <span style={{ padding: '6px 15px', background: '#f0f4f8', borderRadius: '30px', color: '#1E3A8A', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {activeMain} {activeSub ? `› ${activeSub}` : ''} › {activeSeries}
                 </span>
              </div>
            )}

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Curating collection...</p>
              </div>
            ) : (
              <>
                {!activeSeries ? (
                  <div className="empty-state" style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '120px 40px' }}>
                    <Layers size={64} style={{ color: '#eee', marginBottom: '30px' }} />
                    <h2 style={{ fontSize: '1.8rem', color: '#333' }}>Select a collection to view cards</h2>
                    <p style={{ color: '#999', maxWidth: '400px', margin: '0 auto' }}>Choose a category and series from the sidebar to browse our premium card designs.</p>
                  </div>
                ) : filteredCards.length === 0 ? (
                  <div className="empty-state" style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '120px 40px' }}>
                    <Filter size={64} style={{ color: '#eee', marginBottom: '30px' }} />
                    <h2 style={{ fontSize: '1.8rem', color: '#333' }}>New items arrival soon!</h2>
                    <p style={{ color: '#999', maxWidth: '400px', margin: '0 auto' }}>We are currently uploading our latest stock for {activeSeries}. Please check back in a moment.</p>
                  </div>
                ) : (
                  <div className="card-grid">
                    {filteredCards.map(card => (
                      <div className="card group" key={card.id}>
                        <div className="card-image-wrapper">
                          <img src={card.image_url} alt={card.name} className="card-image" loading="lazy" />
                        </div>
                        <div className="card-content">
                          <h3 className="card-title">{card.name}</h3>
                          <div className="card-footer" style={{ marginTop: 'auto' }}>
                            <button 
                              onClick={() => window.location.href = `/product/${card.id}`}
                              className="view-details-btn"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Collections;
