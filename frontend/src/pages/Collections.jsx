import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Filter, ChevronRight, ChevronDown, Layers, Scissors, Box, Package, Star, Heart, Tag, Sparkles } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Collections = ({ filterCategory }) => {
  const iconMap = {
    "All Products": <Layers size={18} />,
    "Cards Only": <Package size={18} />,
    "Card, Cover, Paper Sets": <Package size={18} />,
    "Card, Cover, Board Sets": <Box size={18} />,
    "Brand Series": <Package size={18} />,
    "Ceremony Tags": <Tag size={18} />,
    "Tradition Tags": <Tag size={18} />,
    "Special Collections": <Sparkles size={18} />,
  };

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
    "Brand Series": [],
    "Ceremony Tags": [],
    "Tradition Tags": [],
    "Special Collections": []
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
    const content = collectionTree[main];
    if (Array.isArray(content)) {
      setActiveSub("");
      if (content.length > 0) {
        setActiveSeries(content[0]);
      } else {
        setActiveSeries(main);
      }
    } else if (content && typeof content === 'object') {
      const firstSub = Object.keys(content)[0];
      setActiveSub(firstSub);
      setActiveSeries(content[firstSub][0]);
    } else {
       setActiveSub("");
       setActiveSeries(main);
    }
  };

  const catalogRef = React.useRef(null);

  const handleSeriesClick = (ser) => {
    const newSeries = activeSeries === ser ? "" : ser;
    setActiveSeries(newSeries);
    
    if (newSeries && window.innerWidth < 768) {
      setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="home-page animate-fade-in" style={{ padding: 0 }}>
      <SEO 
        title="Luxury Wedding Card Collections | Gold Foil, 3D & Scroll Cards" 
        description="Browse our exclusive collections of laser-cut, 3D, and metallic wedding cards. Find the perfect box set or pouch set for your special day at Meena Cards."
      />
      
      <div className="collections-container" style={{ 
        display: 'flex', 
        minHeight: '100vh',
        flexDirection: window.innerWidth < 1024 ? 'column' : 'row'
      }}>
        {/* Admin-like Sidebar */}
        <aside className="sidebar-admin-client" style={{ 
          width: window.innerWidth < 1024 ? '100%' : '300px',
          background: '#111827',
          color: '#fff',
          padding: '24px 16px',
          boxShadow: '4px 0 10px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          position: window.innerWidth < 1024 ? 'relative' : 'sticky',
          top: 0,
          height: window.innerWidth < 1024 ? 'auto' : '100vh',
          overflowY: 'auto'
        }}>
          <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px' }}>
            <Layers size={24} style={{ color: 'var(--secondary-color)' }} />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Collections</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(collectionTree).map(([main, content]) => (
              <div key={main} style={{ marginBottom: '4px' }}>
                <div 
                  onClick={() => handleMainClick(main)}
                  style={{ 
                    padding: '12px 16px', 
                    background: activeMain === main ? 'rgba(58, 3, 3, 0.9)' : 'transparent',
                    color: activeMain === main ? '#fff' : '#9ca3af',
                    borderRadius: '8px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    cursor: 'pointer',
                    fontWeight: activeMain === main ? '600' : '500',
                    transition: 'all 0.2s ease',
                    borderLeft: activeMain === main ? '4px solid var(--secondary-color)' : '4px solid transparent'
                  }}
                  className="main-nav-item-styled"
                >
                  {iconMap[main] || <Layers size={18} />}
                  <span style={{ flex: 1, fontSize: '0.95rem' }}>{main}</span>
                  {(!Array.isArray(content) || content.length > 0) && (
                    activeMain === main ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  )}
                </div>

                {activeMain === main && (
                  <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {Array.isArray(content) ? (
                      content.map(ser => (
                        <button 
                          key={ser}
                          onClick={() => handleSeriesClick(ser)}
                          style={{
                            textAlign: 'left',
                            width: '100%',
                            padding: '10px 16px 10px 42px',
                            fontSize: '0.85rem',
                            borderRadius: '4px',
                            background: activeSeries === ser ? 'rgba(255,255,255,0.05)' : 'none',
                            color: activeSeries === ser ? '#fff' : '#6b7280',
                            fontWeight: activeSeries === ser ? '600' : '400',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {ser}
                        </button>
                      ))
                    ) : (
                      Object.entries(content).map(([sub, seriesList]) => (
                        <div key={sub}>
                          <div 
                            onClick={() => handleSubClick(sub, main)}
                            style={{
                              padding: '10px 16px 10px 32px',
                              fontSize: '0.9rem',
                              fontWeight: activeSub === sub ? '600' : '500',
                              color: activeSub === sub ? '#fff' : '#6b7280',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <ChevronRight size={12} style={{ opacity: activeSub === sub ? 1 : 0.3 }} />
                            {sub}
                          </div>
                          {activeSub === sub && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '48px' }}>
                              {seriesList.map(ser => (
                                <button 
                                  key={ser}
                                  onClick={() => handleSeriesClick(ser)}
                                  style={{
                                    textAlign: 'left',
                                    padding: '8px 0',
                                    fontSize: '0.8rem',
                                    borderRadius: '4px',
                                    background: 'none',
                                    color: activeSeries === ser ? 'var(--secondary-color)' : '#9ca3af',
                                    fontWeight: activeSeries === ser ? '700' : '400',
                                    cursor: 'pointer',
                                    border: 'none'
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
          </div>
        </aside>

        {/* Catalog Body */}
        <main style={{ flex: 1, padding: '40px', background: 'var(--bg-color)', overflowY: 'auto' }} ref={catalogRef}>
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2.4rem', color: 'var(--primary-color)', marginBottom: '8px' }}>Catalogue</h2>
            <p style={{ color: '#6b7280' }}>Explore our premium handcrafted invitation series</p>
          </div>

          {activeSeries && (
            <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <span style={{ fontSize: '0.9rem', color: '#9ca3af' }}>Filtered by:</span>
               <span style={{ padding: '8px 16px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeMain} {activeSub ? `› ${activeSub}` : ''} › {activeSeries}
               </span>
            </div>
          )}

          {loading ? (
             <div style={{ textAlign: 'center', padding: '100px 0' }}>
               <div className="spinner"></div>
               <p style={{ color: '#9ca3af', marginTop: '16px' }}>Curating your selection...</p>
             </div>
          ) : !activeSeries ? (
            <div style={{ textAlign: 'center', padding: '100px 40px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Package size={64} style={{ color: '#e5e7eb', marginBottom: '24px' }} />
              <h2 style={{ fontSize: '1.8rem', color: '#374151' }}>No collection selected</h2>
              <p style={{ color: '#9ca3af', maxWidth: '400px', margin: '0 auto' }}>Choose a category from the sidebar to start browsing our premium card designs.</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 40px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <Star size={64} style={{ color: '#e5e7eb', marginBottom: '24px' }} />
              <h2 style={{ fontSize: '1.8rem', color: '#374151' }}>Collection arriving soon</h2>
              <p style={{ color: '#9ca3af', maxWidth: '400px', margin: '0 auto' }}>We are currently updating our stock for {activeSeries}. Please visit another collection while we prepare this for you.</p>
            </div>
          ) : (
            <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '32px' }}>
              {filteredCards.map(card => {
                const cats = Array.isArray(card.category) ? card.category : [card.category || ""];
                const isBrandSeries = cats.some(c => c.toLowerCase().includes('brand series')) || 
                                     card.name.toLowerCase().includes('brand series');
                const stockVal = parseInt(card.stock) || 0;

                return (
                  <div className="card group" key={card.id} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', transition: 'transform 0.3s ease', cursor: 'pointer' }}>
                    <div style={{ height: '320px', overflow: 'hidden', position: 'relative' }}>
                      <img src={card.image_url} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {isBrandSeries && (
                        <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'var(--secondary-color)', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          Brand Series
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '12px', color: '#1f2937' }}>{card.name}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{card.price ? `₹${card.price}` : 'Price on request'}</span>
                        {isBrandSeries ? (
                           <span style={{ fontSize: '0.8rem', color: '#1E3A8A', fontWeight: 'bold', background: '#E0F2FE', padding: '4px 8px', borderRadius: '4px' }}>Contact For Stock</span>
                        ) : (
                           <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: stockVal > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                             {stockVal > 0 ? 'IN STOCK' : 'PRE-ORDER'}
                           </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/product/${card.id}`; }}
                        style={{ width: '100%', marginTop: '20px', padding: '12px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        Enquire Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


export default Collections;
