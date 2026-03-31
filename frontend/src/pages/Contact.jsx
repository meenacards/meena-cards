import React from 'react';
import { Mail, Phone, MapPin, Clock, Store } from 'lucide-react';
import SEO from '../components/SEO';
import './home.css';

const Contact = () => {
  return (
    <div className="home-page animate-fade-in">
      <SEO
        title="Contact Us & Showroom"
        description="Visit the Meena Cards flagship luxury studio in Madurai. Contact us for premium handcrafted wedding invitations, business hours, and location."
      />

      {/* About Section in Contact Page */}
      <section style={{ padding: '60px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', alignItems: 'center', background: '#fff', textAlign: 'center' }}>

          {/* Shop Image Panel */}
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <div className="card glass-panel" style={{ padding: '15px', borderRadius: '16px' }}>
              <img
                src="/shop.jpeg"
                alt="Meena Cards Shop Front"
                style={{ width: '100%', height: 'auto', borderRadius: '12px', boxShadow: '0 15px 40px rgba(0,0,0,0.15)' }}
              />
            </div>
          </div>

          {/* About Text Area */}
          <div style={{ width: '100%', maxWidth: '900px', padding: '30px 40px', background: '#F8FAFC', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <div style={{ marginBottom: '35px' }}>
              <h3 style={{ fontSize: '2.2rem', color: '#1E3A8A', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                <Store size={32} color="#D4AF37" /> About MEENA CARDS
              </h3>
              <p style={{ fontSize: '1.15rem', color: '#4B5563', lineHeight: '2.0', marginBottom: '20px' }}>
                Welcome to <strong style={{ color: '#1E3A8A', fontSize: '1.25rem' }}>Meena Cards</strong>, your premier destination for timeless wedding invitations.
                We specialize in exquisite handcrafted designs that blend perfection with tradition,
                elevating your special occasion into an unforgettable memory.
              </p>
              <p style={{ fontSize: '1.15rem', color: '#4B5563', lineHeight: '2.0' }}>
                Visit our flagship luxury studio in the heart of Madurai to explore a vast curated range of religious
                and contemporary invitation designs.
              </p>
            </div>

            {/* Timing Panel */}
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', justifyContent: 'center' }}>
                <Clock size={28} color="#D4AF37" />
                <h4 style={{ fontSize: '1.3rem', margin: 0 }}>Business Hours</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '4px' }}>Mon - Sat</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>10:00 AM - 9:00 PM</p>
                </div>
                <div style={{ borderLeft: '1px solid #eee', paddingLeft: '30px', textAlign: 'center' }}>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '4px' }}>Sunday</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#C2185B' }}>10:00 AM - 2:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Contact Icons Grid */}
      <section className="catalog container" style={{ padding: '0 0 100px' }}>
        <div className="features-grid" style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px' }}>

          {/* Call Section */}
          <div className="feature-box card glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="usp-icon-wrapper" style={{ margin: '0 auto 20px' }}>
                <Phone size={24} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h3>Direct Contact</h3>
              <div style={{ margin: '15px 0', textAlign: 'left', padding: '0 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', margin: '5px 0', fontSize: '1.2rem', color: '#1E3A8A' }}>
                  <span>Owner number :</span> <span className="gradient-text">99651 25250</span>
                </div>
                <div style={{ height: '1px', background: '#e2e8f0', margin: '15px 0' }}></div>
                <p style={{ fontWeight: 'bold', margin: '10px 0', fontSize: '1.2rem', color: '#333' }}>Office Numbers</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0', fontSize: '1.1rem', color: '#333' }}>
                  <span>Landline :</span> <span className="gradient-text">0452-7964782</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '5px 0', fontSize: '1.1rem', color: '#333' }}>
                  <span>Mobiles:</span>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <span className="gradient-text">80567 46007</span>
                    <span className="gradient-text">82487 23726</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button
                className="btn-primary"
                onClick={() => window.open(`https://wa.me/919965125250?text=Hello Meena Cards! I saw your about page and I'm interested in card designs.`, '_blank')}
              >
                Contact on WhatsApp
              </button>
            </div>
          </div>

          {/* Location Section */}
          <div className="feature-box card glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="usp-icon-wrapper" style={{ margin: '0 auto 20px' }}>
                <MapPin size={24} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h3>Main Showroom</h3>
              <p style={{ fontSize: '1rem', color: '#555', margin: '15px 0 25px 0', lineHeight: '1.5' }}>
                62/1, Manjanakara Street, <br />
                Madurai - 625001, Tamil Nadu
              </p>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button
                className="btn-primary"
                onClick={() => window.open('https://maps.google.com/?q=Meena+Cards+Madurai', '_blank')}
              >
                Find Location
              </button>
            </div>
          </div>

          {/* Email Section */}
          <div className="feature-box card glass-panel" style={{ padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="usp-icon-wrapper" style={{ margin: '0 auto 20px' }}>
                <Mail size={24} style={{ color: 'var(--primary-color)' }} />
              </div>
              <h3>Inquiries Email</h3>
              <p style={{ margin: '15px 0 25px 0', fontWeight: 'bold', color: '#1E3A8A' }}>meenacards.mdu@gmail.com</p>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <button
                className="btn-primary"
                onClick={() => window.location.href = 'mailto:meenacards.mdu@gmail.com'}
              >
                Send an Email
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Contact;
