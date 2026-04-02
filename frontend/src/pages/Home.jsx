import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Sparkles, HeartHandshake, ChevronLeft, ChevronRight } from 'lucide-react';
import SEO from '../components/SEO';
import './home.css';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = React.useRef(null);
  const touchEndX = React.useRef(null);
  const slides = [
    {
      type: 'text',
      logo: '/logo1.png',
      bgColor: 'transparent',
      title: 'MEENA CARDS',
      subtitle: 'Where Every Invitation Tells a Story',
      tagline: '“True love is the joy of life, and a wedding is the beginning of the journey.”',
    },
    {
      image: '/traditions/hindu_slide_new.png',
      bgColor: '#1a2b53',
    },
    {
      image: '/traditions/muslim_slide_new.png',
      bgColor: '#ffffff',
    },
    {
      image: '/traditions/christian_slide_new.png',
      bgColor: '#ffffff',
    },
    {
      image: '/traditions/stats_slide_new.png',
      bgColor: '#c5b49f',
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchEnd = (e) => {
    touchEndX.current = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // swiped left → next slide
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      } else {
        // swiped right → previous slide
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      }
    }
  };

  return (
    <div className="home-page">
      <SEO
        title="Premium Wedding Invitations in Madurai"
        description="India's finest handcrafted wedding invitations. Explore 1000+ premium designs including gold foil & laser-cut. Order via WhatsApp from Madurai, Tamil Nadu."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          "name": "Meena Cards",
          "image": "https://meenacards.com/logo1.png",
          "@id": "https://meenacards.com",
          "url": "https://meenacards.com",
          "telephone": "+919965125250",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "62/1, Manjanakara Street",
            "addressLocality": "Madurai",
            "addressRegion": "TN",
            "postalCode": "625001",
            "addressCountry": "IN"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
            "opens": "10:00",
            "closes": "21:00"
          }
        }}
      />
      {/* HERO SLIDER SECTION */}
      <style>{`
        @media (max-width: 768px) {
          .intro-content {
            text-align: center !important;
            padding: 10px 10px !important;
            display: flex;
            flex-direction: column;
            justify-content: center;
            height: 100%;
          }
          .slide-title { font-size: 1.1rem !important; margin-bottom: 8px !important; letter-spacing: 4px !important; }
          .slide-subtitle { font-size: 1.6rem !important; margin-bottom: 8px !important; line-height: 1.1 !important; }
          .slide-tagline { font-size: 0.9rem !important; margin: 0 auto !important; max-width: 90% !important; }
          .slide-image { display: none !important; }
        }
      `}</style>
      <section
        className="hero-slider"
        style={{ padding: 0, margin: 0, background: 'none', overflow: 'hidden', position: 'relative' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        <style>{`
          .slider-fade-track {
            position: relative;
            width: 100%;
          }
          .slider-fade-slide {
            width: 100%;
            transition: opacity 0.7s ease;
          }
          .slider-fade-slide.inactive {
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0;
            pointer-events: none;
          }
          .slider-fade-slide.active {
            position: relative;
            opacity: 1;
          }
        `}</style>

        <div className="slider-fade-track">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`slider-fade-slide ${index === currentSlide ? 'active' : 'inactive'}`}
              style={{ userSelect: 'none', backgroundColor: slide.type === 'text' ? slide.bgColor : 'transparent' }}
            >
              {slide.image ? (
                <div className="slide-img-wrapper">
                  <img
                    src={slide.image}
                    alt="Wedding Banner"
                    draggable={false}
                    className="slide-banner-img"
                  />
                </div>
              ) : (
                // Text slide (first slide)
                <div className="text-slide-wrapper" style={{ background: 'rgba(255,255,255,0.4)', minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
                  <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', gap: '40px', flexWrap: 'wrap', width: '100%' }}>
                    <div className="intro-content animate-fade-in" style={{ flex: '1 1 300px', position: 'relative', zIndex: 2, padding: '20px 0', textAlign: 'left' }}>
                      <h2 className="slide-title" style={{ color: 'var(--primary-color)', letterSpacing: '8px', fontSize: '2rem' }}>{slide.title}</h2>
                      <h1 className="slide-subtitle" style={{ color: '#0F172A', fontSize: '4.5rem', marginBottom: '30px' }}>{slide.subtitle}</h1>
                      <p className="slide-tagline" style={{ color: '#64748B', fontStyle: 'italic', fontSize: '1.8rem', margin: '0' }}>{slide.tagline}</p>
                    </div>
                    <div className="slide-image animate-fade-in" style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--primary-color)', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(107,6,6,0.15)' }}>
                      <img src={slide.logo} alt="Logo" style={{ maxWidth: '100%', height: 'auto', maxHeight: '250px' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Slider Navigation Dots */}
        <div className="slider-dots" style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', zIndex: 20 }}>
          {slides.map((_, index) => (
            <button
              key={index}
              className={`dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </section>

      {/* 2. RELIGION CATEGORIES SECTION (Restored) */}
      <section className="religion-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Religious Collections</h2>
            <p>Thoughtfully designed cards that honor your traditions and cultural heritage.</p>
          </div>

          <div className="religion-grid">
            <div className="religion-card">
              <div className="religion-img-wrapper">
                <img src="/hindu_cat.png" alt="Hindu Wedding Cards" className="religion-img" />
              </div>
              <h3>Hindu Traditions</h3>
              <p>Featuring traditional motifs, vibrant hues, and auspicious symbolism.</p>
              <Link to="/invitation/Hindu" className="btn-secondary">View Hindu Cards</Link>
            </div>

            <div className="religion-card">
              <div className="religion-img-wrapper">
                <img src="/muslim_cat.png" alt="Muslim Wedding Cards" className="religion-img" />
              </div>
              <h3>Muslim Traditions</h3>
              <p>With refined calligraphy, Islamic patterns, and graceful detailing.</p>
              <Link to="/invitation/Muslim" className="btn-secondary">View Muslim Cards</Link>
            </div>

            <div className="religion-card">
              <div className="religion-img-wrapper">
                <img src="/christian_cat.png" alt="Christian Wedding Cards" className="religion-img" />
              </div>
              <h3>Christian Traditions</h3>
              <p>Blending sophistication with spiritual charm and timeless elegance.</p>
              <Link to="/invitation/Christian" className="btn-secondary">View Christian Cards</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. LATEST ARRIVALS HERO */}
      <section className="latest-arrivals-hero">
        <div className="latest-hero-bg" style={{ backgroundImage: "url('/latest_bg.png')" }}></div>
        <div className="latest-hero-overlay"></div>
        <div className="latest-hero-content">
          <h2>Latest Arrivals</h2>
          <p>Fresh Designs Just Landed! Be the first to discover our newest collection of wedding invitations.</p>
          <Link to="/latest-arrivals" className="btn-primary" style={{ background: '#1E3A8A', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}>
            View More
          </Link>
        </div>
      </section>

      <section className="why-choose-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose MEENA CARDS?</h2>
            <p>We pride ourselves on delivering excellence in every card we create.</p>
          </div>

          <div className="usp-grid">
            <div className="usp-card">
              <div className="usp-icon-wrapper">
                <Sparkles size={32} />
              </div>
              <h3>Unique Designs</h3>
              <p>Over 1000+ exclusive designs ranging from traditional to contemporary modern styles.</p>
            </div>

            <div className="usp-card">
              <div className="usp-icon-wrapper">
                <ShieldCheck size={32} />
              </div>
              <h3>Premium Quality</h3>
              <p>We use the finest paper stock and printing techniques including gold foil and laser cutting.</p>
            </div>

            <div className="usp-card">
              <div className="usp-icon-wrapper">
                <Truck size={32} />
              </div>
              <h3>On-Time Delivery</h3>
              <p>We understand the importance of your timeline and ensure safe, timely delivery across India.</p>
            </div>

            <div className="usp-card">
              <div className="usp-icon-wrapper">
                <HeartHandshake size={32} />
              </div>
              <h3>Trusted Service</h3>
              <p>Decades of experience in making special occasions even more memorable for our customers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. REVIEWS SECTION */}
      <section className="religion-section reviews-section" style={{ padding: '80px 0', paddingTop: '40px' }}>
        <div className="container">
          <div className="section-header">
            <h2>What People Are Saying</h2>
            <p>Read about the beautiful experiences of our happy customers.</p>
          </div>
          <div style={{ marginTop: '50px' }}>
            <ReviewsCarousel />
          </div>
        </div>
      </section>
    </div>
  );
};

// Reviews Carousel Component
const ReviewsCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(2);
  const reviews = [
    { name: "Aisha & Rahul", text: "The cards were absolutely stunning! Everyone loved the intricate design and premium quality. Highly recommend Meena Cards!", stars: 5 },
    { name: "Priya P.", text: "Best shop for wedding cards! The customer service was exceptional and they delivered exactly what we envisioned.", stars: 5 },
    { name: "Mohamed R.", text: "We were looking for something perfect for our Nikah and Meena Cards delivered an elegant masterpiece. The finishing touches were amazing.", stars: 4 },
    { name: "Sarah & John", text: "Such unique designs and beautiful paper quality. The entire process from selection to delivery was so smooth.", stars: 5 },
    { name: "Karthik S.", text: "I ordered my wedding invitations here and the gold foil detailing was exquisite. Truly the best invitation shop!", stars: 4 }
  ];

  const handlePrev = () => setActiveIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  const handleNext = () => setActiveIndex((prev) => (prev + 1) % reviews.length);

  return (
    <div className="reviews-carousel-container group" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>

      <style>{`
        .reviews-carousel-container.group .carousel-arrow {
          opacity: 0;
          visibility: hidden;
          position: absolute;
          top: 15%;
          padding: 10px;
          border-radius: 50%;
          background: white;
          border: 1px solid #eee;
          cursor: pointer;
          z-index: 10;
          color: #1E3A8A;
          transition: all 0.3s;
        }
        .carousel-arrow.left { left: -50px; }
        .carousel-arrow.right { right: -50px; }
        .reviews-carousel-container.group:hover .carousel-arrow {
          opacity: 1;
          visibility: visible;
        }
        @media (max-width: 768px) {
          .carousel-arrow.left { left: 0px !important; }
          .carousel-arrow.right { right: 0px !important; }
          .reviews-carousel-container.group .carousel-arrow {
            opacity: 1 !important;
            visibility: visible !important;
            background: rgba(255,255,255,0.9) !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      <button
        className="carousel-arrow left"
        onClick={handlePrev}
      >
        <ChevronLeft size={24} />
      </button>

      <button
        className="carousel-arrow right"
        onClick={handleNext}
      >
        <ChevronRight size={24} />
      </button>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '40px', height: '120px' }}>
        {reviews.map((r, i) => {
          let isLeft = false;
          let isRight = false;
          let isActive = false;

          if (i === activeIndex) {
            isActive = true;
          } else if (i === (activeIndex - 1 + reviews.length) % reviews.length) {
            isLeft = true;
          } else if (i === (activeIndex + 1) % reviews.length) {
            isRight = true;
          } else {
            return null; // hide others
          }

          let flexOrder = 2;
          if (isLeft) flexOrder = 1;
          if (isActive) flexOrder = 2;
          if (isRight) flexOrder = 3;

          return (
            <div
              key={i}
              onClick={() => setActiveIndex(i)}
              style={{
                order: flexOrder,
                width: isActive ? '100px' : '70px',
                height: isActive ? '100px' : '70px',
                borderRadius: '50%',
                background: isActive ? 'var(--primary-color)' : '#cbd5e1',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isActive ? '3rem' : '2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: isActive ? '4px solid #D4AF37' : '2px solid transparent',
                boxShadow: isActive ? '0 10px 20px rgba(0,0,0,0.1)' : 'none',
                opacity: isActive ? 1 : 0.6
              }}
            >
              {r.name.charAt(0)}
            </div>
          );
        })}
      </div>

      <div className="active-review-content animate-fade-in" key={activeIndex}>
        <div style={{ color: '#D4AF37', letterSpacing: '4px', fontSize: '1.5rem', margin: '15px 0 20px', minHeight: '30px' }}>
          {'★'.repeat(reviews[activeIndex].stars)}{'☆'.repeat(5 - reviews[activeIndex].stars)}
        </div>
        <p style={{ fontStyle: 'italic', color: '#444', fontSize: '1.25rem', lineHeight: '1.8', marginBottom: '25px', maxWidth: '700px', margin: '0 auto 25px' }}>
          "{reviews[activeIndex].text}"
        </p>
        <h4 style={{ color: '#1E3A8A', fontWeight: 'bold', fontSize: '1.1rem' }}>- {reviews[activeIndex].name}</h4>
      </div>
    </div>
  );
};

export default Home;
