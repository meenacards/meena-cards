import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MessageCircle, ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import { sampleCards } from '../data/sampleCards';
import './home.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API_URL}/cards/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.warn('Backend unavailable or product not found, looking in sample cards');
        const fallbackProduct = sampleCards.find(c => c.id === id);
        if (fallbackProduct) {
          setProduct(fallbackProduct);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleWhatsApp = () => {
    if (!product) return;
    const text = encodeURIComponent(`Hello! I am completely in love with the ${product.category} design: "${product.name}". I'd like to discuss customizing and ordering this!`);
    window.open(`https://wa.me/919965125250?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <div className="product-details-container loading-state" style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Loading card details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-container empty-state" style={{ padding: '100px 0', textAlign: 'center' }}>
        <h2>Product not found</h2>
        <button className="btn-primary" onClick={() => navigate('/collections')}>Back to Collections</button>
      </div>
    );
  }

  return (
    <div className="product-details-page animate-fade-in" style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto', flex: 1 }}>
      <SEO 
        title={`${product.name} | Meena Cards Madurai`}
        description={`Order the stunning ${product.name} wedding card from our ${Array.isArray(product.category) ? product.category.join(", ") : product.category} collection at Meena Cards directly through WhatsApp!`}
        jsonLd={{
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": product.name,
          "image": [
            product.image_url
          ],
          "description": `Handcrafted premium ${product.name} wedding invitation by Meena Cards Madurai.`,
          "sku": product.id || "MC-001",
          "brand": {
            "@type": "Brand",
            "name": "Meena Cards"
          },
          "offers": {
            "@type": "Offer",
            "url": window.location.href,
            "priceCurrency": "INR",
            "price": product.price || "150.00",
            "itemCondition": "https://schema.org/NewCondition",
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "Organization",
              "name": "Meena Cards"
            }
          }
        }}
      />
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 'bold', marginBottom: '30px' }}
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', background: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ flex: '1 1 400px', maxWidth: '600px' }}>
          <div style={{ width: '100%', backgroundColor: '#f8f9fa', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
            <img 
              src={product.image_url} 
              alt={product.name} 
              style={{ width: '100%', maxHeight: '550px', objectFit: 'contain' }} 
            />
          </div>
        </div>
        
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <span style={{ display: 'inline-block', padding: '6px 16px', background: '#f0f4f8', color: 'var(--primary-color)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '16px' }}>
              {product.category}
            </span>
            <h1 style={{ fontSize: '2.5rem', color: 'var(--primary-color)', margin: '0 0 16px 0', lineHeight: 1.2 }}>{product.name}</h1>
          </div>

          <div style={{ padding: '24px 0', borderTop: '1px solid #eee', marginTop: '16px' }}>
            <button 
              className="whatsapp-btn"
              onClick={handleWhatsApp}
              style={{ 
                width: '100%', padding: '16px', fontSize: '1.1rem', 
                background: '#25D366', 
                display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center', 
                color: '#fff', border: 'none', borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 'bold' 
              }}
            >
              <MessageCircle size={24} /> 
              Contact on WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
