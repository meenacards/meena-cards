import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutDashboard, Plus, Trash2, Edit, LogOut, Image as ImageIcon, X, Save, Menu, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import './admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginStatus, setLoginStatus] = useState('Login');
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [cards, setCards] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: [],
    image: null,
    is_latest: false,
    is_offer: false,
    price: '',
    stock: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Press management states
  const [presses, setPresses] = useState([]);
  const [isPressFormOpen, setIsPressFormOpen] = useState(false);
  const [editingPress, setEditingPress] = useState(null);
  const [pressFormData, setPressFormData] = useState({ name: '', address: '', ph_no: '' });
  const [pressLoading, setPressLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'dashboard') {
        fetchCards();
      } else if (activeTab === 'presses') {
        fetchPresses();
      }
    }
  }, [isAuthenticated, activeTab]);

  const fetchCards = async () => {
    setFetchError(null);
    try {
      const response = await axios.get(`${API_URL}/cards`);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards', error);
      setFetchError('Failed to load products. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginStatus('Logging in...');
    setTimeout(() => {
      const validUser = import.meta.env.VITE_ADMIN_USER || 'vel';
      const validPass = import.meta.env.VITE_ADMIN_PASS || '1234';
      if (loginForm.username === validUser && loginForm.password === validPass) {
        setIsAuthenticated(true);
        showToast('✅ Logged in successfully!', 'success');
      } else {
        showToast('❌ Wrong credentials. Please try again.', 'error');
        setLoginStatus('Login');
      }
    }, 1000);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'category_item') {
      const currentCats = [...formData.category];
      if (checked) {
        setFormData(prev => ({ ...prev, category: [...currentCats, value] }));
      } else {
        setFormData(prev => ({ ...prev, category: currentCats.filter(c => c !== value) }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: [],
      image: null,
      is_latest: false,
      is_offer: false,
      price: '',
      stock: ''
    });
    setImagePreview(null);
    setEditingCard(null);
    setIsFormOpen(false);
  };

  const editCard = (card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      category: Array.isArray(card.category) ? card.category : [card.category],
      image: null,
      is_latest: card.is_latest || false,
      is_offer: card.is_offer || false,
      price: card.price || '',
      stock: card.stock || ''
    });
    setImagePreview(card.image_url);
    setIsFormOpen(true);
  };

  const deleteCard = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await axios.delete(`${API_URL}/cards/${id}`);
        fetchCards();
      } catch (error) {
        console.error('Error deleting card', error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.category.length === 0) {
      alert("Please select at least one category");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const formPayload = new FormData();
      formPayload.append('name', formData.name);
      
      // Append each category to the payload
      formData.category.forEach(cat => {
        formPayload.append('category', cat);
      });

      formPayload.append('description', ''); 
      formPayload.append('is_latest', formData.is_latest);
      formPayload.append('is_offer', formData.is_offer);
      
      if (formData.image) {
        formPayload.append('image', formData.image);
      }
      formPayload.append('price', formData.price || 0);
      formPayload.append('stock', formData.stock || 0);

      const headers = { 'Content-Type': 'multipart/form-data' };

      if (editingCard) {
        await axios.put(`${API_URL}/cards/${editingCard.id}`, formPayload, { headers });
      } else {
        await axios.post(`${API_URL}/cards`, formPayload, { headers });
      }

      fetchCards();
      resetForm();
    } catch (error) {
      console.error('Error saving data', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error saving data';
      alert(`Error saving data: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Press Management Functions ---
  const fetchPresses = async () => {
    setPressLoading(true);
    try {
      const response = await axios.get(`${API_URL}/presses`);
      setPresses(response.data);
    } catch (error) {
      console.error('Error fetching presses', error);
      showToast('❌ Failed to load presses', 'error');
    } finally {
      setPressLoading(false);
    }
  };

  const handlePressInputChange = (e) => {
    const { name, value } = e.target;
    setPressFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetPressForm = () => {
    setPressFormData({ name: '', address: '', ph_no: '' });
    setEditingPress(null);
    setIsPressFormOpen(false);
  };

  const editPress = (press) => {
    setEditingPress(press);
    setPressFormData({
      name: press.name,
      address: press.address,
      ph_no: press.ph_no || ''
    });
    setIsPressFormOpen(true);
  };

  const deletePress = async (id) => {
    if (window.confirm('Are you sure you want to delete this press record?')) {
      try {
        await axios.delete(`${API_URL}/presses/${id}`);
        showToast('✅ Press deleted successfully');
        fetchPresses();
      } catch (error) {
        console.error('Error deleting press', error);
        showToast('❌ Failed to delete press', 'error');
      }
    }
  };

  const handlePressSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPress) {
        await axios.put(`${API_URL}/presses/${editingPress.id}`, pressFormData);
        showToast('✅ Press updated successfully');
      } else {
        await axios.post(`${API_URL}/presses`, pressFormData);
        showToast('✅ Press added successfully');
      }
      fetchPresses();
      resetPressForm();
    } catch (error) {
      console.error('Error saving press', error);
      showToast('❌ Error saving press', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToCategory = (catName) => {
    setActiveTab('dashboard'); // Ensure dashboard/products view is active
    setIsSidebarOpen(false); // Close mobile sidebar after selection
    
    // Small delay to allow re-render before scrolling
    setTimeout(() => {
      const safeId = `group-${catName.replace(/\s+/g, '-').toLowerCase()}`;
      const element = document.getElementById(safeId);
      const container = document.querySelector('.admin-main-panel');
      
      if (element && container) {
        const offset = 100; // Account for sticky header
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        // Correct: element position relative to container + current scroll offset
        const elementPosition = elementRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({
          top: elementPosition - offset,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-wrapper">
        {/* Toast Notification on Login Page */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: toast.type === 'success' ? '#10B981' : '#EF4444',
            color: 'white',
            padding: '14px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            fontWeight: '600',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '320px',
            lineHeight: '1.4'
          }}>
            {toast.message}
          </div>
        )}
        <style>{`
          @keyframes slideInRight {
            from { opacity: 0; transform: translateX(60px); }
            to { opacity: 1; transform: translateX(0); }
          }
        `}</style>
        <form className="admin-login-box" onSubmit={handleLoginSubmit}>
          <h2 className="admin-login-title">Admin Login</h2>
          <div className="admin-login-group">
            <label>Username</label>
            <input 
              type="text" 
              value={loginForm.username} 
              onChange={e => setLoginForm({...loginForm, username: e.target.value})} 
              required
            />
          </div>
          <div className="admin-login-group">
            <label>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password} 
                onChange={e => setLoginForm({...loginForm, password: e.target.value})} 
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={loginStatus === 'Logging in...'}
          >
            {loginStatus}
          </button>
        </form>
      </div>
    );
  }

  const categoryHierarchy = {
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
    "Card, Cover, Board Sets": ["8x8 ITC Board Set", "10x8 Metallic ITC Board Set", "12x8 Metallic ITC Board Set", "12x8 Offset ITC Board Set"],
    "Brand Series": ["V Cards", "K Cards", "R Cards", "ES Cards"],
    "Ceremony Tags": ["Ear piercing", "Puberty", "House warming"],
    "Tradition Tags": ["Hindu", "Muslim", "Christian"],
    "Special Collections": ["Friends Card", "Luxe", "Offer"]
  };

  const getFlatCategories = () => {
    const flat = [];
    const traverse = (obj) => {
      if (Array.isArray(obj)) {
        flat.push(...obj);
      } else if (typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          if (Array.isArray(obj[key])) {
            flat.push(...obj[key]);
          } else {
            traverse(obj[key]);
          }
        });
      }
    };
    traverse(categoryHierarchy);
    return [...new Set(flat)];
  };




  return (
    <div className="admin-dashboard-wrapper">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          fontWeight: '600',
          fontSize: '0.95rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideInRight 0.3s ease',
          maxWidth: '320px',
          lineHeight: '1.4'
        }}>
          {toast.message}
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      
      {/* Mobile Top Header (Fixed) */}
      <div className="admin-mobile-header desktop-hidden">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={24} />
          </button>
          <img src="/logo1.png" alt="Logo" style={{ height: '30px' }} />
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button onClick={() => setIsFormOpen(true)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><Plus size={24}/></button>
          <button onClick={() => { showToast('👋 Logged out successfully!', 'success'); setTimeout(() => setIsAuthenticated(false), 1000); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><LogOut size={20}/></button>
        </div>
      </div>

      {/* Overlay to close sidebar on click */}
      {isSidebarOpen && (
        <div className="mobile-overlay" onClick={() => setIsSidebarOpen(false)} style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', zIndex: 999 }}></div>
      )}

      <aside className={`admin-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <button className="desktop-hidden close-sidebar-btn" onClick={() => setIsSidebarOpen(false)} style={{ position:'absolute', top:'10px', right:'10px', color:'white', background:'none', border:'none' }}><X size={24}/></button>
          <img src="/logo1.png" alt="Logo" className="admin-sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="sidebar-icon">📦</span> Dashboard
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'presses' ? 'active' : ''}`}
            onClick={() => setActiveTab('presses')}
          >
            <span className="sidebar-icon">🏢</span> Presses
          </button>
          <button 
            className="sidebar-link desktop-only" 
            onClick={() => activeTab === 'presses' ? setIsPressFormOpen(true) : setIsFormOpen(true)}
          >
            <Plus size={18} /> Add {activeTab === 'presses' ? 'Press' : 'Card'}
          </button>
          
          <div className="sidebar-categories-nav">
            <h4 className="sidebar-section-title">QUICK VIEW</h4>
            <div className="sidebar-scroll-area">
              {Object.entries(categoryHierarchy).map(([group, content]) => (
                <div key={group} className="sidebar-group-item">
                  <span className="sidebar-group-label">{group}</span>
                  {Array.isArray(content) ? (
                    content.map(ser => (
                      <button key={ser} className="sidebar-category-link" onClick={() => scrollToCategory(ser)}>{ser}</button>
                    ))
                  ) : (
                    Object.entries(content).map(([sub, series]) => (
                      <div key={sub} style={{ paddingLeft: '10px' }}>
                         <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{sub}</div>
                         {series.map(ser => (
                            <button key={ser} className="sidebar-category-link" onClick={() => scrollToCategory(ser)}>{ser}</button>
                         ))}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <main className="admin-main-panel">
        <div className="admin-panel-header">
          <h2>{activeTab === 'dashboard' ? 'Products Management' : 'Presses Management'}</h2>
          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
            <button className="btn-add-model" onClick={() => activeTab === 'presses' ? setIsPressFormOpen(true) : setIsFormOpen(true)}>
              + New {activeTab === 'presses' ? 'Press' : 'Card'}
            </button>
            <button className="sidebar-logout" style={{ margin: 0, padding: '10px 20px' }} onClick={() => { showToast('👋 Logged out successfully!', 'success'); setTimeout(() => setIsAuthenticated(false), 1000); }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          {activeTab === 'dashboard' ? (
            loading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading products...</div>
            ) : fetchError ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>{fetchError}</div>
            ) : (
              <table className="custom-admin-table">
                <thead>
                  <tr>
                    <th>THUMBNAIL</th>
                    <th>NAME</th>
                    <th>CATEGORIES</th>
                    <th>PRICE (₹)</th>
                    <th>STOCK</th>
                    <th>FLAGS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cards.reduce((acc, card) => {
                    const cardCats = Array.isArray(card.category) ? card.category : [card.category];
                    cardCats.forEach(cat => {
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(card);
                    });
                    if (card.is_offer === true || card.is_offer === "true") {
                      if (!acc['Offer']) acc['Offer'] = [];
                      acc['Offer'].push(card);
                    }
                    return acc;
                  }, {})).sort(([a], [b]) => a[0].localeCompare(b[0])).map(([groupName, groupCards]) => (
                    <React.Fragment key={groupName}>
                      <tr id={`group-${groupName.replace(/\s+/g, '-').toLowerCase()}`} style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan="5" style={{ padding: '12px 24px', fontWeight: 'bold', color: '#1e293b', fontSize: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{groupName.toUpperCase()}</span>
                            <span style={{ fontSize: '0.8rem', background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: '20px' }}>
                              {groupCards.length} Cards
                            </span>
                          </div>
                        </td>
                      </tr>
                      {groupCards.sort((a,b) => a.name.localeCompare(b.name)).map(card => (
                        <tr key={card.id}>
                          <td>
                            <img src={card.image_url} alt={card.name} className="admin-thumb" />
                          </td>
                          <td className="admin-item-name">{card.name}</td>
                          <td className="admin-item-cat">
                            {Array.isArray(card.category) ? card.category.join(", ") : card.category}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#059669' }}>
                            {card.price ? `₹${card.price}` : '—'}
                          </td>
                          <td style={{ fontWeight: 'bold', color: card.stock > 10 ? '#475569' : '#ef4444' }}>
                            {card.stock || 0}
                          </td>
                          <td className="admin-item-flags" style={{ verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {card.is_latest && <span style={{ background: '#D4AF37', color: '#1E3A8A', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>LATEST</span>}
                              {card.is_offer && <span style={{ background: '#ff4757', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>OFFER</span>}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons-flex">
                              <button className="pill-btn-edit" onClick={() => editCard(card)}>Edit</button>
                              <button className="pill-btn-del" onClick={() => deleteCard(card.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            // Presses View
            pressLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading presses...</div>
            ) : (
              <table className="custom-admin-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>ADDRESS</th>
                    <th>PHONE NO</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(presses.reduce((acc, press) => {
                    const addr = press.address || 'Other';
                    if (!acc[addr]) acc[addr] = [];
                    acc[addr].push(press);
                    return acc;
                  }, {})).sort(([a], [b]) => a.localeCompare(b)).map(([groupAddr, groupPresses]) => (
                    <React.Fragment key={groupAddr}>
                      <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan="4" style={{ padding: '10px 24px', fontWeight: 'bold', color: '#1e293b' }}>
                          {groupAddr.toUpperCase()} ({groupPresses.length})
                        </td>
                      </tr>
                      {groupPresses.map(press => (
                        <tr key={press.id}>
                          <td className="admin-item-name">{press.name}</td>
                          <td className="admin-item-cat">{press.address}</td>
                          <td>{press.ph_no || <em style={{color: '#94a3b8'}}>Not set</em>}</td>
                          <td>
                            <div className="action-buttons-flex">
                              <button className="pill-btn-edit" onClick={() => editPress(press)}>Edit</button>
                              <button className="pill-btn-del" onClick={() => deletePress(press.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {presses.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No presses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )
          )}
        </div>
      </main>

      {isFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '750px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>{editingCard ? 'Edit Card' : 'Add New Card'}</h3>
              <button className="close-btn" onClick={resetForm}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="admin-form" style={{maxHeight: '80vh', overflowY: 'scroll', paddingRight: '15px'}}>
              <div className="form-group">
                <label>Card Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  required 
                  placeholder="e.g. Royal Gold Wedding Card"
                />
              </div>

              <div className="form-group">
                <label style={{fontWeight: 'bold', marginBottom: '10px', display: 'block'}}>Select Categories (Folder View)</label>
                <div className="category-folder-container" style={{
                  background: '#f8fafc',
                  padding: '5px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {Object.entries(categoryHierarchy).map(([main, content]) => (
                    <div key={main} style={{ marginBottom: '10px', borderBottom: '1px solid #edf2f7', padding: '10px' }}>
                      <div style={{ fontWeight: '800', color: 'var(--primary-color)', marginBottom: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ transform: 'rotate(90deg)', fontSize: '10px' }}>▶</span> {main}
                      </div>
                      
                      <div style={{ paddingLeft: '20px' }}>
                        {Array.isArray(content) ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                            {content.map(cat => (
                              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                <input 
                                  type="checkbox" 
                                  name="category_item" 
                                  value={cat} 
                                  checked={formData.category.includes(cat)} 
                                  onChange={handleInputChange} 
                                  style={{ width: 'auto' }}
                                />
                                {cat}
                              </label>
                            ))}
                          </div>
                        ) : (
                          Object.entries(content).map(([sub, series]) => (
                            <div key={sub} style={{ marginBottom: '15px' }}>
                              <div style={{ fontWeight: '700', color: '#64748b', fontSize: '0.8rem', marginBottom: '8px', borderLeft: '3px solid #cbd5e1', paddingLeft: '8px' }}>{sub}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', paddingLeft: '10px' }}>
                                {series.map(cat => (
                                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input 
                                      type="checkbox" 
                                      name="category_item" 
                                      value={cat} 
                                      checked={formData.category.includes(cat)} 
                                      onChange={handleInputChange} 
                                      style={{ width: 'auto' }}
                                    />
                                    {cat}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div className="form-row" style={{ gap: '20px', margin: '20px 0' }}>
                <div className="form-group-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    name="is_latest" 
                    id="is_latest"
                    checked={formData.is_latest} 
                    onChange={handleInputChange} 
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="is_latest" style={{ marginBottom: 0 }}>Latest Arrival</label>
                </div>
                <div className="form-group-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    name="is_offer" 
                    id="is_offer"
                    checked={formData.is_offer} 
                    onChange={handleInputChange} 
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="is_offer" style={{ marginBottom: 0 }}>Special Offer</label>
                </div>
              </div>

              <div className="form-row" style={{ gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input 
                    type="number" 
                    name="price" 
                    value={formData.price} 
                    onChange={handleInputChange} 
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input 
                    type="number" 
                    name="stock" 
                    value={formData.stock} 
                    onChange={handleInputChange} 
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Image Thumbnail</label>
                <div className="image-upload-wrapper">
                  <input 
                    type="file" 
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="file-input"
                    required={!editingCard}
                  />
                  <label htmlFor="image-upload" className="image-upload-label">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <ImageIcon size={32} />
                        <span>Click to upload image</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn-primary flex-align" disabled={isSubmitting}>
                  <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isPressFormOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ width: '500px', maxWidth: '95%' }}>
            <div className="modal-header">
              <h3>{editingPress ? 'Edit Press' : 'Add New Press'}</h3>
              <button className="close-btn" onClick={resetPressForm}><X size={24} /></button>
            </div>
            
            <form onSubmit={handlePressSubmit} className="admin-form">
              <div className="form-group">
                <label>Press Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={pressFormData.name} 
                  onChange={handlePressInputChange} 
                  required 
                  placeholder="e.g. Jayachitra Press"
                />
              </div>

              <div className="form-group">
                <label>Address / Location</label>
                <input 
                  type="text" 
                  name="address" 
                  value={pressFormData.address} 
                  onChange={handlePressInputChange} 
                  required 
                  placeholder="e.g. Abhiramam"
                />
              </div>

              <div className="form-group">
                <label>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  name="ph_no" 
                  value={pressFormData.ph_no} 
                  onChange={handlePressInputChange} 
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-outline" onClick={resetPressForm}>Cancel</button>
                <button type="submit" className="btn-primary flex-align" disabled={isSubmitting}>
                  <Save size={18} /> {isSubmitting ? 'Saving...' : 'Save Press Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
