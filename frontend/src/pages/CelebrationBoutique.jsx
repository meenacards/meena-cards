import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { Filter, ShoppingBag } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CelebrationBoutique = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const boutiqueCategories = ['Calendars', 'Thambulam Bags'];
  const displayCategories = ['All', 'Calendars', 'Thambulam Bags'];

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/cards`);
      setCards(response.data || []);
    } catch (error) {
      console.warn('Backend unavailable');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const boutiqueCards = cards.filter(c => {
    const cardCats = Array.isArray(c.category) ? c.category : [c.category];
    return cardCats.some(cat => boutiqueCategories.includes(cat));
  });

  const filteredCards = activeCategory === 'All' 
    ? boutiqueCards 
    : boutiqueCards.filter(c => {
        const cardCats = Array.isArray(c.category) ? c.category : [c.category];
        return cardCats.includes(activeCategory);
      });

  const getCount = (cat) => {
    if (cat === 'All') return boutiqueCards.length;
    return boutiqueCards.filter(c => {
      const cardCats = Array.isArray(c.category) ? c.category : [c.category];
      return cardCats.includes(cat);
    }).length;
  };

  return (
    <div className="home-page" style={{ padding: '60px 0', minHeight: '80vh' }}>
      <SEO 
        title="Boutique & Accessories" 
        description="Find the perfect complementary pieces for your divine celebrations. Explore Meena Cards boutique collection of calendars, thambulam bags, and more."
      />
      <section className="catalog container">
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', marginBottom: '15px' }}>Boutique & Accessories</h2>
          <p style={{ fontSize: '1.1rem', color: '#666' }}>Find the perfect complementary pieces for your divine celebrations.</p>
        </div>

        {/* BOUTIQUE TABS */}
        <div className="boutique-tabs">
          <style>{`
            .boutique-tabs {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-gap: 15px;
              max-width: 500px;
              margin: 0 auto 50px;
            }
            .boutique-tabs button:first-child {
              grid-column: 1 / span 2;
              justify-self: center;
              width: auto;
              min-width: 150px;
            }
            @media (max-width: 500px) {
              .boutique-tabs {
                grid-template-columns: 1fr;
                padding: 0 20px;
              }
              .boutique-tabs button:first-child {
                grid-column: 1;
              }
              .boutique-tabs button {
                width: 100%;
              }
            }
          `}</style>
          {displayCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '12px 20px',
                borderRadius: '50px',
                border: `2px solid ${activeCategory === cat ? 'var(--primary-color)' : '#ddd'}`,
                background: activeCategory === cat ? 'var(--primary-color)' : 'white',
                color: activeCategory === cat ? 'white' : '#555',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeCategory === cat ? '0 10px 20px rgba(107, 6, 6, 0.2)' : 'none'
              }}
            >

              {cat}
              <span style={{ 
                fontSize: '0.75rem', 
                background: activeCategory === cat ? 'rgba(255,255,255,0.2)' : '#eee',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {getCount(cat)}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner"></div>
            <p>Loading your accessories...</p>
          </div>
        ) : (
          <>
            {filteredCards.length === 0 ? (
              <div className="empty-state" style={{ padding: '80px 0', textAlign: 'center', background: '#fff', borderRadius: '20px', border: '1px dashed #ddd' }}>
                <ShoppingBag size={64} style={{ color: '#ddd', marginBottom: '20px' }} />
                <h2 style={{ fontSize: '2rem', color: '#666', marginBottom: '15px' }}>Coming Soon</h2>
                <p style={{ color: '#888' }}>We are curating a special collection of items for you.</p>
              </div>
            ) : (
              <div className="card-grid">
                {filteredCards.map(card => (
                  <div className="card group" key={card.id}>
                    <div className="card-image-wrapper">
                      <img src={card.image_url} alt={card.name} className="card-image" loading="lazy" />
                    </div>
                    <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h3 className="card-title">{card.name}</h3>
                      <p className="card-category-label" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: '600', marginBottom: '15px' }}>
                        {Array.isArray(card.category) ? card.category.filter(c => boutiqueCategories.includes(c)).join(", ") : card.category}
                      </p>
                      <div className="card-footer" style={{ marginTop: 'auto' }}>
                        <a 
                          href={`https://wa.me/919965125250?text=Hello Meena Cards! I'm interested in ${card.name}. Is it available?`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whatsapp-btn"
                          style={{
                            textDecoration: 'none', 
                            background: 'var(--primary-color)', 
                            color: 'white', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            borderRadius: '40px', 
                            fontWeight: '700', 
                            width: '100%',
                            padding: '12px 24px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          }}
                        >
                          Enquire Now
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default CelebrationBoutique;
