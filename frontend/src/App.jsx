import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Analytics from './components/Analytics';
import Home from './pages/Home';
import Collections from './pages/Collections';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import ProductDetails from './pages/ProductDetails';
import LatestArrivals from './pages/LatestArrivals';
import Invitation from './pages/Invitation';
import CelebrationBoutique from './pages/CelebrationBoutique';
import Footer from './components/Footer';
import './App.css';

const WhatsappFloat = () => (
  <a
    href="https://wa.me/919965125250?text=Hello%20Meena%20Cards!%20I%20absolutely%20love%20your%20beautiful%20wedding%20collections.%20Could%20we%20discuss%20a%20card%20design%20and%20place%20an%20order?"
    target="_blank"
    rel="noopener noreferrer"
    className="whatsapp-float"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="whatsapp-svg">
      <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.126.551 4.135 1.545 5.918L.044 23.472l5.655-1.488c1.722.9 3.665 1.383 5.706 1.383 6.646 0 12.031-5.385 12.031-12.031C23.437 5.385 18.052 0 11.406 0zm0 19.896c-1.748 0-3.461-.469-4.965-1.354l-.356-.213-3.692.969.988-3.596-.233-.374a9.907 9.907 0 01-1.52-5.32c0-5.5 4.475-9.975 9.975-9.975s9.975 4.475 9.975 9.975-4.475 9.975-9.975 9.975zm5.474-7.468c-.3-.151-1.776-.879-2.053-.981-.275-.101-.476-.151-.676.151-.2.301-.776.981-.951 1.181-.176.202-.352.226-.652.076-1.55-.776-2.583-1.638-3.57-3.32-.152-.253.111-.274.654-.881.076-.1.151-.202.226-.301.075-.1.1-.176.151-.301.05-.125.025-.226-.013-.301-.038-.076-.676-1.634-.926-2.238-.242-.587-.487-.507-.676-.516-.176-.008-.376-.008-.576-.008-.2 0-.526.076-.801.376-.275.301-1.051 1.028-1.051 2.508s1.076 2.909 1.226 3.11c.151.202 2.121 3.238 5.138 4.54 2.105.908 2.872.776 3.424.651.564-.131 1.776-.726 2.027-1.428.251-.702.251-1.304.176-1.428-.076-.125-.276-.202-.576-.352z" />
    </svg>
  </a>
);

const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Analytics />
      {!isAdmin && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsappFloat />}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/latest-arrivals" element={<LatestArrivals />} />
          <Route path="/invitation" element={<Invitation />} />
          <Route path="/celebration-boutique" element={<CelebrationBoutique />} />
          <Route path="/product/:id" element={<ProductDetails />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
