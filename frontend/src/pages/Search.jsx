import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search as SearchIcon, Filter } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Search = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

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

  const filteredCards = cards.filter(c => {
    if (!query) return false;
    return c.name.toLowerCase().includes(query.toLowerCase()) || 
           (c.category && (Array.isArray(c.category) ? c.category.join(' ') : c.category).toLowerCase().includes(query.toLowerCase()));
  });

  return (
    <div className="home-page animate-fade-in" style={{ padding: '60px 0', minHeight: '80vh' }}>
      <SEO 
        title={`Search results for "${query}"`} 
        description="Search our premium collection of wedding invitations and cards."
      />
      <div className="container">
        <div className="section-header" style={{ marginBottom: '40px' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
            <SearchIcon className="gradient-text" style={{ color: 'var(--primary-color)' }} size={32} />
            <h2 style={{ margin: 0 }}>Search Results</h2>
          </div>
          {query ? (
            <p>Showing search results for <strong>"{query}"</strong></p>
          ) : (
            <p>Please enter a search term in the navigation bar.</p>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching collections...</p>
          </div>
        ) : (
          <div className="collections-content">
            {filteredCards.length > 0 ? (
              <div className="card-grid">
                {filteredCards.map(card => (
                  <div className="card group" key={card.id}>
                    <div className="card-image-wrapper">
                      <img src={card.image_url} alt={card.name} className="card-image" loading="lazy" />
                      {card.is_latest && <span className="latest-badge">LATEST</span>}
                    </div>
                    <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h3 className="card-title">{card.name}</h3>
                      <div className="card-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                        <button 
                          onClick={() => navigate(`/product/${card.id}`)}
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
            ) : (
              <div className="empty-state" style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '120px 40px', textAlign: 'center' }}>
                <Filter size={64} style={{ color: '#eee', marginBottom: '30px' }} />
                <h2 style={{ fontSize: '1.8rem', color: '#333' }}>We couldn't find exact matches for "{query}"</h2>
                <p style={{ color: '#999', maxWidth: '450px', margin: '20px auto 30px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                  Don't worry! We have thousands of new and exclusive designs in our physical store and frequently update our online catalog with fresh stock. 
                </p>
                <button 
                  onClick={() => navigate('/collections')}
                  className="btn-primary"
                  style={{ background: 'var(--primary-color)', color: 'white', padding: '12px 30px', borderRadius: '30px', fontWeight: 'bold' }}
                >
                  Browse Full Catalogue
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
