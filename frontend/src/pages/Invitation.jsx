import { Layers } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/SEO';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Invitation = () => {
  const { category } = useParams();
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [activeTradition, setActiveTradition] = useState(category || 'All');
  const [loading, setLoading] = useState(true);
  const traditions = ['All', 'Hindu', 'Muslim', 'Christian', 'Ear piercing', 'Puberty', 'House warming', 'Friends Card', 'Luxe'];

  // Sync active tradition when URL param changes
  useEffect(() => {
    if (category && traditions.includes(category)) {
      setActiveTradition(category);
    } else {
      setActiveTradition('All');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [category]);

  // All categories that belong on the Invitation page
  const invitationAllowlist = [
    'V Cards', 'R Cards', 'K Cards', 'ES Cards',
    'Friends Card',
    'Hindu', 'Muslim', 'Christian',
    'Ear piercing', 'Puberty', 'House warming',
    'Luxe'
  ];

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (cards.length > 0) {
      const filtered = cards.filter(c => {
        const cardCats = Array.isArray(c.category) ? c.category : [c.category];

        // Luxe: substring match (catches "Luxe", "Luxe Models", etc.)
        if (activeTradition === 'Luxe') {
          return cardCats.some(cat => cat && cat.toLowerCase().includes('luxe'));
        }

        // "All": show any card that belongs to at least one invitation category
        if (activeTradition === 'All') {
          return cardCats.some(cat =>
            invitationAllowlist.some(allowed =>
              cat && (cat === allowed || cat.toLowerCase().includes('luxe'))
            )
          );
        }

        // Specific tab: exact match
        return cardCats.includes(activeTradition);
      }).sort((a, b) => a.name.localeCompare(b.name));

      setFilteredCards(filtered);
    } else {
      setFilteredCards([]);
    }
  }, [activeTradition, cards]);

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

  const getCount = (trad) => {
    return cards.filter(c => {
      const cardCats = Array.isArray(c.category) ? c.category : [c.category];

      if (trad === 'Luxe') {
        return cardCats.some(cat => cat && cat.toLowerCase().includes('luxe'));
      }

      if (trad === 'All') {
        return cardCats.some(cat =>
          invitationAllowlist.some(allowed =>
            cat && (cat === allowed || cat.toLowerCase().includes('luxe'))
          )
        );
      }

      return cardCats.includes(trad);
    }).length;
  };
  const getSeoData = () => {
    switch (activeTradition) {
      case 'Hindu':
        return {
          title: "Traditional Hindu Wedding Cards | Meena Cards Madurai",
          description: "Discover elegant Hindu wedding invitation cards featuring traditional motifs, Ganesha designs, and premium finishings. Handcrafted with love in Madurai."
        };
      case 'Muslim':
        return {
          title: "Premium Muslim Nikah Invitation Cards | Islamic Wedding Cards",
          description: "Celebrate your Nikah with our exclusive collection of Islamic wedding invitations. Custom handmade designs available. Order online from Meena Cards."
        };
      case 'Christian':
        return {
          title: "Elegant Christian Wedding Invitations | Meena Cards",
          description: "Beautifully crafted Christian wedding cards. Explore pristine white, floral, and gold-foiled holy matrimony designs delivered across India."
        };
      default:
        return {
          title: `Divine Traditions Portfolio - ${activeTradition}`,
          description: `Browse our specialized wedding invitation portfolio for ${activeTradition}. From rich traditions to elegant templates, Meena Cards offers flawless designs.`
        };
    }
  };

  const seoData = getSeoData();
  return (
    <div className="home-page" style={{ padding: '60px 0', minHeight: '80vh' }}>
      <SEO 
        title={seoData.title} 
        description={seoData.description}
      />
      <section className="catalog container">
        <div className="section-header" style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', marginBottom: '15px' }}>Divine Traditions</h2>
          <p style={{ fontSize: '1.1rem', color: '#666' }}>Explore our exquisite collections tailored for your sacred celebrations.</p>
        </div>

        {/* TRADITION TABS */}
        <div className="tradition-tabs-container">
          <style>{`
            .tradition-tabs-container {
              display: flex;
              justify-content: center;
              gap: 15px;
              margin-bottom: 50px;
              flex-wrap: wrap;
            }
            @media (max-width: 768px) {
              .tradition-tabs-container {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-gap: 10px;
                padding: 0 15px;
                max-width: 500px;
                margin: 0 auto 50px;
              }
              .tradition-tabs-container button:first-child {
                grid-column: 1 / span 2;
                justify-self: center;
                width: auto;
                min-width: 120px;
              }
              .tradition-tabs-container button {
                width: 100%;
                padding: 10px 10px !important;
                font-size: 0.85rem !important;
                white-space: nowrap;
              }
            }
          `}</style>
          {traditions.map(trad => (
            <button
              key={trad}
              onClick={() => setActiveTradition(trad)}
              className={activeTradition === trad ? 'active' : ''}
              style={{
                padding: '12px 30px',
                borderRadius: '50px',
                border: `2px solid ${activeTradition === trad ? 'var(--primary-color)' : '#ddd'}`,
                background: activeTradition === trad ? 'var(--primary-color)' : 'white',
                color: activeTradition === trad ? 'white' : '#555',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTradition === trad ? '0 10px 20px rgba(107, 6, 6, 0.2)' : 'none'
              }}
            >




              {trad}
              <span style={{ 
                fontSize: '0.75rem', 
                background: activeTradition === trad ? 'rgba(255,255,255,0.2)' : '#eee',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {getCount(trad)}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state" style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner"></div>
            <p>Loading your collections...</p>
          </div>
        ) : (
          <>
            {filteredCards.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '100px 0', background: '#fff', borderRadius: '20px', border: '1px dashed #ddd' }}>
                <p style={{ color: '#888', fontSize: '1.2rem' }}>New designs for {activeTradition} invitations arriving soon!</p>
              </div>
            ) : (
              <div className="card-grid">
                {filteredCards.map(card => (
                  <div className="card group" key={card.id}>
                    <div className="card-image-wrapper">
                      <img src={card.image_url} alt={card.name} className="card-image" loading="lazy" />
                      {card.is_latest && <span className="latest-badge">LATEST</span>}
                    </div>
                    <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h3 className="card-title">{card.name}</h3>
                      <div className="card-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <button 
                          onClick={() => window.location.href = `/product/${card.id}`}
                          className="view-details-btn"
                          style={{ width: '100%' }}
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
      </section>
    </div>
  );
};

export default Invitation;
