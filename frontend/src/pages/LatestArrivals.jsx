import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Flame, Sparkle, Filter } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LatestArrivals = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/cards`);
      let allCards = [];
      if (response.data && response.data.length > 0) {
        allCards = response.data;
      } else {
        allCards = sampleCards;
      }
      setCards(allCards.filter(c => c.is_latest === true));
    } catch (error) {
      console.warn('Backend unavailable');
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page animate-fade-in" style={{ minHeight: '80vh' }}>
      {/* Dynamic Hero Section from Home Page Design */}
      <section className="latest-arrivals-hero" style={{ height: '500px' }}>
        <div className="latest-hero-bg" style={{ backgroundImage: "url('/latest_bg.png')" }}></div>
        <div className="latest-hero-overlay"></div>
        <div className="latest-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
            <Flame className="glow-text" color="#FFB300" size={48} />
            <h2 style={{ margin: 0, fontSize: '4rem' }}>Latest Arrivals</h2>
          </div>
          <p style={{ fontSize: '1.4rem', maxWidth: '600px', margin: '0 auto' }}>
            Be the first to explore the newest designs in our 2026 Collection.
          </p>
        </div>
      </section>

      <section className="catalog container" style={{ padding: '80px 20px' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading newest arrivals...</p>
          </div>
        ) : (
          <>
            {cards.length === 0 ? (
              <div className="empty-state">
                <Filter size={64} style={{ color: '#ddd', marginBottom: '20px' }} />
                <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Fresh designs are on the way!</h2>
                <p style={{ color: '#666', marginBottom: '40px' }}>Our artisans are currently crafting new items. Check back soon.</p>
                <Link to="/collections" className="btn-primary">Explore All Collections</Link>
              </div>
            ) : (
              <div className="card-grid">
                {cards.map(card => (
                  <div className="card glass-panel group" key={card.id}>
                    <div className="card-image-wrapper">
                      <img src={card.image_url} alt={card.name} className="card-image" loading="lazy" />
                      <div className="category-badge">NEW ARRIVAL</div>
                    </div>
                    <div className="card-content">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Sparkle size={14} color="#D4AF37" />
                        <h3 className="card-title">{card.name}</h3>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '15px' }}>{card.category}</p>
                      <div className="card-footer" style={{ marginTop: 'auto' }}>
                        <Link 
                          to={`/product/${card.id}`}
                          className="view-details-btn"
                        >
                          View Details
                        </Link>
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

export default LatestArrivals;
