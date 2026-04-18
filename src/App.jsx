import React, { useState, useEffect, useMemo, createContext, useContext, useReducer, useCallback, forwardRef, useRef } from 'react';
import { 
  Search, ShoppingCart, Heart, User, LogOut, Trash2, Plus, Minus, 
  ChevronRight, Star, Filter, X, Eye, ShoppingBag, ArrowRight,
  Globe, LayoutGrid, List, CheckCircle, AlertCircle,
  Moon, Sun, Share2, MessageSquare, MessageCircle, Camera, Mail, 
  MapPin, Package, Camera as CameraIcon, Settings
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';

/** * ==========================================
 * 1. SERVICES & UTILS
 * ==========================================
 */

const API_BASE = "https://fakestoreapi.com";

const ApiService = {
  async getProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return await res.json();
    } catch (error) {
      console.error("ApiService.getProducts Error:", error);
      throw error;
    }
  },
  async getCategories() {
    try {
      const res = await fetch(`${API_BASE}/products/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json();
    } catch (error) {
      console.error("ApiService.getCategories Error:", error);
      throw error;
    }
  }
};

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getCategoryTheme = (category) => {
  switch (category) {
    case "electronics": return { color: "#00d2ff", bg: "bg-[#00d2ff]", text: "text-[#00d2ff]" };
    case "jewelery": return { color: "#ffce00", bg: "bg-[#ffce00]", text: "text-[#ffce00]" };
    case "men's clothing": return { color: "#4f46e5", bg: "bg-[#4f46e5]", text: "text-[#4f46e5]" };
    case "women's clothing": return { color: "#f43f5e", bg: "bg-[#f43f5e]", text: "text-[#f43f5e]" };
    default: return { color: "#ffffff", bg: "bg-white", text: "text-white" };
  }
};

const safeJsonParse = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;   // FIXED
    return JSON.parse(item);
  } catch (e) {
    return fallback;
  }
};

/** * ==========================================
 * 2. STATE MANAGEMENT
 * ==========================================
 */

const StoreContext = createContext();

const initialState = {
  cart: safeJsonParse('sh_cart', []),
  wishlist: safeJsonParse('sh_wishlist', []),
  user: safeJsonParse('sh_user', null),
  theme: 'light',
  flickerMode: false
};

function storeReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      const userData = { ...action.payload, address: action.payload.address || '', avatar: action.payload.avatar || null, orders: [
        { id: '#ORD-9921', date: 'Oct 12, 2023', total: 129.50, status: 'Delivered' },
        { id: '#ORD-8812', date: 'Nov 05, 2023', total: 45.00, status: 'Processing' }
      ]};
      localStorage.setItem('sh_user', JSON.stringify(userData));
      return { ...state, user: userData };
    case 'UPDATE_USER': {
      const newUser = { ...state.user, ...action.payload };
      localStorage.setItem('sh_user', JSON.stringify(newUser));
      return { ...state, user: newUser };
    }
    case 'LOGOUT':
      localStorage.removeItem('sh_user');
      return { ...state, user: null };
    case 'ADD_TO_CART': {
      const existing = state.cart.find(item => item.id === action.payload.id);
      let newCart = existing 
        ? state.cart.map(item => item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...state.cart, { ...action.payload, quantity: 1 }];
      localStorage.setItem('sh_cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
    }
    case 'REMOVE_FROM_CART': {
      const newCart = state.cart.filter(item => item.id !== action.payload);
      localStorage.setItem('sh_cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
    }
    case 'UPDATE_QUANTITY': {
      const newCart = state.cart.map(item => item.id === action.payload.id ? { ...item, quantity: Math.max(1, action.payload.q) } : item);
      localStorage.setItem('sh_cart', JSON.stringify(newCart));
      return { ...state, cart: newCart };
    }
    case 'TOGGLE_WISHLIST': {
      const exists = state.wishlist.find(i => i.id === action.payload.id);
      const newWish = exists ? state.wishlist.filter(i => i.id !== action.payload.id) : [...state.wishlist, action.payload];
      localStorage.setItem('sh_wishlist', JSON.stringify(newWish));
      return { ...state, wishlist: newWish };
    }
    case 'PLACE_ORDER': {
      const newOrder = {
        id: `#ORD-${Math.floor(Math.random() * 10000)}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Processing',
        total: action.payload.total
      };
      const newUser = state.user ? { ...state.user, orders: [newOrder, ...(state.user.orders || [])] } : { username: 'Guest', orders: [newOrder] };
      localStorage.setItem('sh_user', JSON.stringify(newUser));
      localStorage.setItem('sh_cart', JSON.stringify([]));
      return { ...state, cart: [], user: newUser };
    }
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'TOGGLE_FLICKER':
      return { ...state, flickerMode: !state.flickerMode };
    default:
      return state;
  }
}

/** * ==========================================
 * 3. ATOMIC COMPONENTS
 * ==========================================
 */

const Skeleton = ({ className }) => <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-2xl ${className}`} />;

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed bottom-6 right-6 z-[2000] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border bg-white dark:bg-slate-800 ${type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
      {type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
      <span className="font-medium uppercase text-xs tracking-widest">{message}</span>
    </motion.div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-[1501]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-500 dark:text-slate-400" /></button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
};

/** * ==========================================
 * 4. LIGHT SWITCH COMPONENT
 * ==========================================
 */

const LightSwitch = () => {
  const { state, dispatch } = useContext(StoreContext);
  const [flickering, setFlickering] = useState(false);
  const pullY = useMotionValue(0);
  const cordHeight = useTransform(pullY, [0, 100], [140, 240]);

  const toggleTheme = () => {
    if (flickering) return;
    
    if (state.flickerMode) {
      setFlickering(true);
      const timings = [100, 250, 400, 550, 850];
      timings.forEach((time, index) => {
        setTimeout(() => {
          dispatch({ type: 'TOGGLE_THEME' });
          if (index === timings.length - 1) setFlickering(false);
        }, time);
      });
    } else {
      dispatch({ type: 'TOGGLE_THEME' });
    }
  };

  return (
    <div className={`relative p-10 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all ${flickering ? 'animate-pulse opacity-50' : ''}`}>
      <h3 className="text-2xl font-black mb-4 text-slate-900 dark:text-white uppercase tracking-tighter">
        {state.theme === 'light' ? 'lights on.' : 'lights off.'}
      </h3>
      
      <div className="flex items-center gap-2 mb-12">
        <input 
          type="checkbox" id="flicker" checked={state.flickerMode} 
          onChange={() => dispatch({ type: 'TOGGLE_FLICKER' })}
          className="accent-[#ff3c78] w-4 h-4 cursor-pointer"
        />
        <label htmlFor="flicker" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer">flicker lights on.</label>
      </div>

      <div className="relative h-64 w-32 flex justify-center">
        <svg width="100" height="240" viewBox="0 0 100 240" className="overflow-visible">
          <motion.line 
            x1="50" y1="0" x2="50" style={{ y2: cordHeight }}
            stroke={state.theme === 'light' ? '#333' : '#ff3c78'} strokeWidth="4" strokeLinecap="round"
          />
          <motion.g style={{ y: pullY }}>
            <circle cx="50" cy="140" r="15" fill={state.theme === 'light' ? '#333' : '#ff3c78'} className="cursor-grab active:cursor-grabbing shadow-lg" />
          </motion.g>
        </svg>

        <motion.div 
  drag="y"
  dragConstraints={{ top: 0, bottom: 80 }}
  style={{ y: pullY }}
  onDragEnd={(_, info) => {
    if (info.offset.y > 50) toggleTheme();   // FIXED
    pullY.set(0);
  }}
  className="absolute top-[125px] left-1/2 -translate-x-1/2 w-12 h-12 rounded-full cursor-grab active:cursor-grabbing z-10"
/>

        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 transition-opacity duration-300 pointer-events-none">
           <svg className={`w-32 h-32 transition-colors duration-500 ${state.theme === 'light' ? 'text-amber-400' : 'text-slate-700'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zM9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z" />
           </svg>
        </div>
      </div>
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Pull Cord to Toggle</div>
    </div>
  );
};

/** * ==========================================
 * 5. NAVIGATION
 * ==========================================
 */

const Navbar = ({ onViewChange, currentView, openCart, openLogin }) => {
  const { state, dispatch } = useContext(StoreContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuHovered, setIsUserMenuHovered] = useState(false);
  const cartCount = state.cart.reduce((acc, item) => acc + item.quantity, 0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      <section className="bg-black py-2 px-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] sm:text-xs text-white/90 font-medium">
          <p className="hidden sm:block">Free shipping, 30-day return or refund guarantee.</p>
          <div className="flex gap-4 sm:gap-6 uppercase tracking-widest w-full sm:w-auto justify-center sm:justify-end">
            {!state.user ? (
              <>
                <button onClick={openLogin} className="hover:text-[#ff3c78] transition-colors">SIGN IN</button>
                <button onClick={openLogin} className="hover:text-[#ff3c78] transition-colors">SIGN UP</button>
              </>
            ) : (
              <span className="text-[#ff3c78] font-black tracking-tighter">VIP MEMBER ACCESS</span>
            )}
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-50 bg-white dark:bg-slate-900 shadow-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden flex flex-col gap-1.5 p-2 z-50">
            <span className={`w-6 h-0.5 bg-black dark:bg-white transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-black dark:bg-white transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-6 h-0.5 bg-black dark:bg-white transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>

          <ul className={`fixed md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-white dark:bg-slate-900 md:bg-transparent flex flex-col md:flex-row items-center gap-8 p-10 md:p-0 transition-all duration-300 z-40 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            {['home', 'shop', 'blog', 'contact'].map(view => (
              <li key={view}>
                <button 
                  onClick={() => { onViewChange(view === 'blog' || view === 'contact' ? 'home' : view); setIsMenuOpen(false); }}
                  className={`capitalize text-sm font-black tracking-widest relative group transition-colors ${currentView === view ? 'text-[#ff3c78]' : 'text-slate-900 dark:text-white'}`}
                >
                  {view.toUpperCase()}
                  <span className={`absolute -bottom-2 left-0 h-0.5 bg-[#ff3c78] transition-all duration-300 ${currentView === view ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </button>
              </li>
            ))}
          </ul>

          <div className="absolute left-1/2 -translate-x-1/2 cursor-pointer" onClick={() => onViewChange('home')}>
             <img src="/Gemini_Generated_Image_7tu9lb7tu9lb7tu9.png" alt="Logo" className="h-12" />
          </div>

          <div className="flex items-center gap-4">
              <button onClick={openCart} className="relative p-2 hover:text-[#ff3c78] transition-colors">
                <ShoppingCart size={22} className="text-slate-900 dark:text-white" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff3c78] text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
              </button>

              {state.user && (
                <div 
                  className="relative"
                  onMouseEnter={() => setIsUserMenuHovered(true)}
                  onMouseLeave={() => setIsUserMenuHovered(false)}
                  onClick={() => onViewChange('profile')}
                >
                  <button className={`p-1.5 rounded-full border-2 transition-all ${currentView === 'profile' ? 'border-[#ff3c78] scale-110' : 'border-slate-200 dark:border-slate-700'}`}>
                    {state.user.avatar ? (
                      <img src={state.user.avatar} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#ff3c78] flex items-center justify-center text-white font-bold">{state.user.username[0].toUpperCase()}</div>
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {isUserMenuHovered && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 shadow-2xl rounded-2xl p-4 border border-slate-100 dark:border-slate-700 z-[100]"
                      >
                        <p className="text-[10px] font-black uppercase text-[#ff3c78] mb-1">{getGreeting()}</p>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate uppercase tracking-tighter text-lg">{state.user.username}</h4>
                        <hr className="my-3 border-slate-100 dark:border-slate-700" />
                        <button className="flex items-center gap-3 w-full text-left text-xs font-black text-slate-500 hover:text-[#ff3c78] py-2 transition-colors uppercase">Account Settings</button>
                        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'LOGOUT' }); onViewChange('home'); }} className="flex items-center gap-3 w-full text-left text-xs font-black text-rose-500 py-2 transition-colors uppercase">Logout</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
          </div>
        </div>
      </nav>
    </>
  );
};

/** * ==========================================
 * 6. PRODUCT CARD & VIEWS
 * ==========================================
 */

const ProductCard = forwardRef(({ product, onQuickView, onAddCart, isWishlisted, onWishlist }, ref) => {
  const theme = getCategoryTheme(product.category);
  return (
    <motion.div ref={ref} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      className="group relative w-full h-[480px] bg-[#191919] rounded-[20px] overflow-hidden transition-all duration-500 shadow-xl">
      <div className={`absolute top-[-50%] left-0 w-full h-full ${theme.bg} transition-all duration-500 ease-in-out group-hover:top-[-70%]`} style={{ transform: 'skewY(345deg)', transformOrigin: 'top left' }} />
      <style>{`.group:hover div[style*="skewY(345deg)"] { transform: skewY(390deg) !important; }`}</style>
      <div className="absolute bottom-[-10px] left-[-5px] font-black text-[6em] text-white/5 uppercase select-none pointer-events-none line-clamp-1 whitespace-nowrap leading-none">{product.category.split(' ')[0]}</div>
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button onClick={(e) => { e.stopPropagation(); onWishlist(product); }} className={`p-2 rounded-full backdrop-blur-md border border-white/10 transition-all ${isWishlisted ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/40 hover:text-rose-400'}`}><Heart size={18} fill={isWishlisted ? "currentColor" : "none"} /></button>
        <button onClick={(e) => { e.stopPropagation(); onQuickView(product); }} className="p-2 bg-white/5 text-white/40 hover:text-white rounded-full backdrop-blur-md border border-white/10 transition-all"><Eye size={18} /></button>
      </div>
      <div className="relative w-full flex justify-center items-center pt-8 z-10 transition-transform duration-500 group-hover:scale-110">
        <img src={product.image} alt={product.title || "product"} className="h-[260px] w-auto object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]" />
      </div>
      <div className="relative p-5 flex flex-col items-center justify-center text-center z-20">
        <h3 className="text-white font-bold text-sm uppercase tracking-wider line-clamp-1 mb-1">{product.title}</h3>
        <div className="flex items-center gap-2 mb-2"><div className="flex items-center"><Star size={12} className="fill-amber-400 text-amber-400" /><span className="text-[10px] text-white/60 ml-1">{product.rating?.rate || 0}</span></div><span className="text-white/20">|</span><span className="text-[10px] text-white/60 uppercase">{product.category}</span></div>
        <h2 className="!text-white text-2xl font-black tracking-tight">${Math.floor(product.price)}.<small className="text-sm opacity-60">{(product.price % 1).toFixed(2).substring(2)}</small></h2>
        <button onClick={() => onAddCart(product)} className={`relative lg:absolute lg:bottom-[-60px] opacity-100 lg:opacity-0 lg:group-hover:bottom-[0px] lg:group-hover:opacity-100 px-8 py-3 mt-4 rounded-full font-black text-xs uppercase tracking-widest text-black ${theme.bg} transition-all duration-500 hover:scale-105 shadow-xl`}>Add To Cart</button>
      </div>
    </motion.div>
  );
});

const HomeView = ({ products, loading, onShopNow, onQuickView, onAddCart, isWishlisted, onWishlist }) => {
  const topSales = useMemo(() => products.slice(0, 4), [products]);
  const newArrivals = useMemo(() => products.slice(4, 8), [products]);
  const hotSales = useMemo(() => products.slice(8, 12), [products]);

  return (
    <div className="space-y-0">
      <section id="home" className="relative min-h-[80vh] flex items-center bg-[#f3f2ee] dark:bg-slate-950 overflow-hidden">
        <div className="absolute inset-0"><img src="https://i.postimg.cc/t403yfn9/home2.jpg" alt="Hero" className="w-full h-full object-cover object-right" /></div>
        <div className="container mx-auto px-6 relative z-10"><motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="max-w-xl">
          <p className="text-[#ff3c78] font-bold tracking-[2px] mb-4 uppercase text-xs">Summer Collection</p>
          <p className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900  leading-tight mb-6 uppercase tracking-tighter">Shop The Latest<br/>Trends Now</p>
          <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">A specialist label creating luxury essentials. Ethically crafted with an unwavering commitment to exceptional quality.</p>
          <button onClick={onShopNow} className="bg-black dark:bg-white dark:text-black text-white px-10 py-4 font-black tracking-[2px] flex items-center gap-2 hover:bg-[#ff3c78] dark:hover:bg-[#ff3c78] transition-colors uppercase text-xs">SHOP NOW <ArrowRight size={20} /></button>
        </motion.div></div>
      </section>

      <section className="py-20 container mx-auto px-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-8">{[
        { name: "Clothing Collections", img: "https://i.postimg.cc/Xqmwr12c/clothing.webp" },
        { name: "Shoes Spring", img: "https://i.postimg.cc/8CmBZH5N/shoes.webp" },
        { name: "Accessories", img: "https://i.postimg.cc/MHv7KJYp/access.webp" }
      ].map((item, i) => (
        <div key={i} className="relative h-[400px] group overflow-hidden rounded-2xl shadow-xl">
          <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-black/40 lg:bg-black/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-6">
            <h3 className="text-white text-3xl font-black mb-6 uppercase tracking-widest">{item.name}</h3>
            <button onClick={onShopNow} className="text-white font-black border-b-2 border-[#ff3c78] pb-1 hover:text-[#ff3c78] transition-colors uppercase text-xs tracking-widest">Shop Now</button>
          </div>
        </div>
      ))}</div></section>

      {[{ title: "Top Sales", data: topSales }, { title: "New Arrivals", data: newArrivals }, { title: "Hot Sales", data: hotSales }].map((section, idx) => (
        <section key={idx} className="py-20 container mx-auto px-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{section.title}</h2>
            <button onClick={onShopNow} className="text-[#ff3c78] font-black uppercase text-xs tracking-widest flex items-center gap-2">View All <ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{loading ? ([...Array(4)].map((_, i) => <Skeleton key={i} className="h-[480px]" />)) : (section.data.map(p => (<ProductCard key={p.id} product={p} onQuickView={onQuickView} onAddCart={onAddCart} onWishlist={onWishlist} isWishlisted={isWishlisted(p.id)} />)))}</div>
        </section>
      ))}

      {/* LATEST NEWS SECTION - FIXED THEME TOGGLE */}
      <section id="news" className="py-24 bg-white dark:bg-white transition-colors duration-300">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#ff3c78] font-black tracking-[2px] mb-2 uppercase text-xs">Latest News</p>
            {/* Heading remains white because background is dark zinc-900 or zinc-950 */}
            <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Fashion New Trends</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { date: "12 Feb 2024", title: "What Curling Irons Are The Best Ones", img: "https://i.postimg.cc/2y6wbZCm/news1.jpg" },
              { date: "17 Feb 2024", title: "The Health Benefits Of Sunglasses", img: "https://i.postimg.cc/9MXPK7RT/news2.jpg" },
              { date: "26 Feb 2024", title: "Eternity Bands Do Last Forever", img: "https://i.postimg.cc/x1KKdRLM/news3.jpg" }
            ].map((news, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 group shadow-2xl rounded-3xl overflow-hidden border border-slate-100 dark:border-white/5 transition-colors">
                <div className="h-64 overflow-hidden"><img src={news.img} alt={news.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /></div>
                <div className="p-8">
                  <p className="text-slate-400 text-[10px] mb-4 font-black uppercase tracking-widest flex items-center gap-2"><Mail size={14} /> {news.date}</p>
                  <h4 className="text-xl font-black mb-6 text-slate-900 dark:text-white line-clamp-2 leading-snug uppercase tracking-tighter">{news.title}</h4>
                  <button className="text-[#ff3c78] font-black uppercase text-xs tracking-widest border-b-2 border-[#ff3c78] pb-1 hover:text-slate-900 dark:hover:text-white transition-colors">Read More</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="py-24 container mx-auto px-6"><div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start"><div className="rounded-[40px] overflow-hidden shadow-2xl h-[500px] border border-slate-100 dark:border-slate-800"><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3782.121169986175!2d73.90618951442687!3d18.568575172551647!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2c131ed5b54a7%3A0xad718b8b2c93d36d!2sSky%20Vista!5e0!3m2!1sen!2sin!4v1654257749399!5m2!1sen!2sin" className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all duration-1000" loading="lazy" title="Office Location" /></div><div className="space-y-10"><div><p className="text-[#ff3c78] font-black tracking-[2px] mb-2 uppercase text-xs">Information</p><h2 className="text-5xl font-black text-slate-900 dark:text-white mb-6 uppercase tracking-tighter">Contact Us</h2><p className="text-slate-500 leading-relaxed font-bold">As you might expect of a company that began as a high-end interiors contractor, we pay strict attention.</p></div><div className="grid grid-cols-2 gap-8"><div><h3 className="font-black text-xl mb-2 text-slate-900 dark:text-white uppercase">USA</h3><p className="text-slate-500 text-sm font-bold uppercase tracking-tighter">195 E Parker Square Dr, Parker, CO 801<br/>+43 982-314-0958</p></div><div><h3 className="font-black text-xl mb-2 text-slate-900 dark:text-white uppercase">INDIA</h3><p className="text-slate-500 text-sm font-bold uppercase tracking-tighter">Anotech Tower, Sector 62, Noida<br/>+91 120-456-7890</p></div></div><form className="space-y-4" onSubmit={e => e.preventDefault()}><div className="grid grid-cols-2 gap-4"><input placeholder="NAME" className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black uppercase text-xs" /><input placeholder="EMAIL" className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black uppercase text-xs" /></div><textarea rows="4" placeholder="MESSAGE" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white resize-none font-black uppercase text-xs shadow-inner" /><button className="bg-black dark:bg-[#ff3c78] text-white px-12 py-5 font-black uppercase tracking-widest hover:bg-[#ff3c78] transition-colors w-full sm:w-auto rounded-2xl shadow-xl text-xs">Send Message</button></form></div></div></section>
    </div>
  );
};

const ProfileView = () => {
  const { state, dispatch } = useContext(StoreContext);
  const [formData, setFormData] = useState({ 
    username: state.user?.username || '', 
    address: state.user?.address || '',
    avatar: state.user?.avatar || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null);

  const handleUpdate = (e) => {
    e.preventDefault();
    dispatch({ type: 'UPDATE_USER', payload: formData });
    setIsEditing(false);
    setToast({ message: "Profile Updated Successfully!" });
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, avatar: reader.result });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
            <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#ff3c78]/20 shadow-xl bg-slate-100 dark:bg-slate-800">
                {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={48} /></div>}
              </div>
              <label className="absolute bottom-1 right-1 bg-black text-white p-2.5 rounded-full cursor-pointer hover:bg-[#ff3c78] transition-colors shadow-lg"><CameraIcon size={16} /><input type="file" className="hidden" onChange={handleFile}/></label>
            </div>
            <h2 className="text-2xl font-black !text-white uppercase tracking-tighter mb-1">{state.user?.username}</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">VIP Gold Member</p>
            <button onClick={() => setIsEditing(!isEditing)} className="w-full py-4 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#ff3c78] hover:text-white hover:border-[#ff3c78] transition-all flex items-center justify-center gap-3 text-slate-900 dark:text-white"><Settings size={14}/> {isEditing ? 'Cancel Edit' : 'Edit Profile'}</button>
          </div>
          <LightSwitch />
        </div>

        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form key="edit" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleUpdate} className="bg-white dark:bg-slate-900 rounded-[32px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit Account</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Username</label><input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none outline-none focus:ring-2 ring-[#ff3c78] font-black text-slate-900 dark:text-white text-lg" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Address</label><input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Enter Address" className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border-none outline-none focus:ring-2 ring-[#ff3c78] font-black text-slate-900 dark:text-white text-lg" /></div>
                </div>
                <button className="bg-[#ff3c78] text-white px-10 py-5 font-black uppercase tracking-widest rounded-2xl hover:shadow-2xl shadow-[#ff3c78]/20 transition-all text-xs">Save Identity</button>
              </motion.form>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[32px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-8"><Package className="text-[#ff3c78]" size={24} /><h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Order Dashboard</h3></div>
                  <div className="space-y-4">
                    {state.user?.orders && state.user.orders.length > 0 ? (
                      state.user.orders.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[28px] hover:scale-[1.02] transition-transform shadow-sm border border-slate-100 dark:border-white/5">
                        <div><p className="font-black text-slate-900 dark:text-white text-lg">{order.id}</p><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{order.date}</p></div>
                        <div className="text-right"><p className="font-black !text-white text-lg">${order.total.toFixed(2)}</p><span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{order.status}</span></div>
                      </div>
                    ))) : (
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No orders yet.</p>
                    )}
                  </div>
                </div>
                {state.user?.address && (
                  <div className="bg-[#ff3c78] rounded-[40px] p-10 shadow-2xl text-white relative overflow-hidden">
                    <MapPin size={140} className="absolute right-[-40px] bottom-[-40px] opacity-10" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Default Ship-to</h3>
                    <p className="font-black text-xl leading-relaxed opacity-90">{state.user.address}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>{toast && <Toast message={toast.message} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
};

const ShopView = ({ products, loading, onQuickView, onAddCart, isWishlisted, onWishlist }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [sortOrder, setSortOrder] = useState("latest");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    ApiService.getCategories().then(setCategories).catch(err => console.error(err));
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
    if (sortOrder === 'price-asc') return result.sort((a, b) => a.price - b.price);
    if (sortOrder === 'price-desc') return result.sort((a, b) => b.price - a.price);
    return result.sort((a, b) => b.id - a.id);
  }, [products, debouncedSearch, selectedCategory, sortOrder]);

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        <aside className="w-full lg:w-72 space-y-10">
          <div>
            <h4 className="text-xs font-black uppercase tracking-[2px] text-slate-400 mb-6">Search Product</h4>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="TYPE HERE..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold" 
              />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-[2px] text-slate-400 mb-6">Categories</h4>
            <div className="space-y-2">
              <button onClick={() => setSelectedCategory('all')} className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedCategory === 'all' ? 'bg-black dark:bg-[#ff3c78] text-white shadow-xl translate-x-2' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>All Products</button>
              {categories.map(cat => <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-black dark:bg-[#ff3c78] text-white shadow-xl translate-x-2' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{cat}</button>)}
            </div>
          </div>
        </aside>
        <main className="flex-1">
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Shop Explorer</h2><p className="text-slate-400 font-bold uppercase text-xs">Found {filteredProducts.length} premium items</p></div><div className="relative"><button onClick={() => setIsFilterOpen(!isFilterOpen)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-[#ff3c78] dark:hover:border-[#ff3c78] transition-colors shadow-sm flex items-center gap-3 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest"><Filter size={16} /> Sort By</button><AnimatePresence>{isFilterOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-2 z-[100]">{[{ id: 'latest', label: 'Latest Arrivals' }, { id: 'price-desc', label: 'Price: High to Low' }, { id: 'price-asc', label: 'Price: Low to High' }].map(item => (<button key={item.id} onClick={() => { setSortOrder(item.id); setIsFilterOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors ${sortOrder === item.id ? 'bg-slate-100 dark:bg-slate-800 text-[#ff3c78]' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>{item.label}</button>))}</motion.div>)}</AnimatePresence></div></div>
          {loading ? <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[480px]" />)}</div> : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"><AnimatePresence mode="popLayout">{filteredProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={onQuickView} onAddCart={onAddCart} onWishlist={onWishlist} isWishlisted={isWishlisted(p.id)} />)}</AnimatePresence></div>}
        </main>
      </div>
    </div>
  );
};

const paymentCss = `
.card-item { perspective: 2000px; }
.card-item__side {
    backface-visibility: hidden;
    transition: all 0.8s cubic-bezier(0.71, 0.03, 0.56, 0.85);
    transform-style: preserve-3d;
}
.card-item__side.-back { transform: rotateY(-180deg); }
.card-item.-active .card-item__side.-front { transform: rotateY(180deg); }
.card-item.-active .card-item__side.-back { transform: rotateY(0); }

.truck-button {
    --color: #fff; --background: #2B3044; --tick: #16BF78; --base: #0D0F18;
    --wheel: #2B3044; --wheel-inner: #646B8C; --wheel-dot: #fff;
    --back: #6D58FF; --back-inner: #362A89; --back-inner-shadow: #2D246B;
    --front: #A6ACCD; --front-shadow: #535A79; --front-light: #FFF8B1;
    --window: #2B3044; --window-shadow: #404660; --street: #646B8C;
    --street-fill: #404660; --box: #DCB97A; --box-shadow: #B89B66;
    padding: 12px 0; width: 100%; max-width: 300px; cursor: pointer; text-align: center;
    position: relative; border: none; outline: none; color: var(--color);
    background: var(--background); border-radius: var(--br, 15px);
    -webkit-appearance: none; -webkit-tap-highlight-color: transparent;
    transform-style: preserve-3d; transform: rotateX(var(--rx, 0deg)) translateZ(0);
    transition: transform .5s, border-radius .3s linear var(--br-d, 0s);
    height: 50px; display: flex; justify-content: center; align-items: center;
}
.truck-button:before, .truck-button:after {
    content: ''; position: absolute; left: 0; top: 0; width: 100%; height: 6px;
    display: block; background: var(--b, var(--street)); transform-origin: 0 100%;
    transform: rotateX(90deg) scaleX(var(--sy, 1));
}
.truck-button:after { --sy: var(--progress, 0); --b: var(--street-fill); }
.truck-button .default, .truck-button .success {
    display: block; font-weight: 500; font-size: 14px; line-height: 24px;
    opacity: var(--o, 1); transition: opacity .3s;
}
.truck-button .success { --o: 0; position: absolute; top: 12px; left: 0; right: 0; }
.truck-button .success svg {
    width: 12px; height: 10px; display: inline-block; vertical-align: top;
    fill: none; margin: 7px 0 0 12px; stroke: var(--tick); stroke-width: 2;
    stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 16px;
    stroke-dashoffset: var(--offset, 16px); transition: stroke-dashoffset .4s ease .45s;
}
.truck-button .truck {
    position: absolute; width: 72px; height: 28px; left: 50%; margin-left: -36px;
    transform: rotateX(90deg) translate3d(var(--truck-x, 4px), calc(var(--truck-y-n, -26) * 1px), 12px);
}
.truck-button .truck:before, .truck-button .truck:after {
    content: ''; position: absolute; bottom: -6px; left: var(--l, 18px);
    width: 10px; height: 10px; border-radius: 50%; z-index: 2;
    box-shadow: inset 0 0 0 2px var(--wheel), inset 0 0 0 4px var(--wheel-inner);
    background: var(--wheel-dot); transform: translateY(calc(var(--truck-y) * -1px)) translateZ(0);
}
.truck-button .truck:after { --l: 54px; }
.truck-button .truck .wheel, .truck-button .truck .wheel:before {
    position: absolute; bottom: var(--b, -6px); left: var(--l, 6px);
    width: 10px; height: 10px; border-radius: 50%; background: var(--wheel);
    transform: translateZ(0);
}
.truck-button .truck .wheel { transform: translateY(calc(var(--truck-y) * -1px)) translateZ(0); }
.truck-button .truck .wheel:before { --l: 35px; --b: 0; content: ''; }
.truck-button .truck .front, .truck-button .truck .back, .truck-button .truck .box { position: absolute; }
.truck-button .truck .back {
    left: 0; bottom: 0; z-index: 1; width: 47px; height: 28px; border-radius: 1px 1px 0 0;
    background: linear-gradient(68deg, var(--back-inner) 0%, var(--back-inner) 22%, var(--back-inner-shadow) 22.1%, var(--back-inner-shadow) 100%);
}
.truck-button .truck .back:before, .truck-button .truck .back:after { content: ''; position: absolute; }
.truck-button .truck .back:before { left: 11px; top: 0; right: 0; bottom: 0; z-index: 2; border-radius: 0 1px 0 0; background: var(--back); }
.truck-button .truck .back:after { border-radius: 1px; width: 73px; height: 2px; left: -1px; bottom: -2px; background: var(--base); }
.truck-button .truck .front {
    left: 47px; bottom: -1px; height: 22px; width: 24px;
    -webkit-clip-path: polygon(55% 0, 72% 44%, 100% 58%, 100% 100%, 0 100%, 0 0);
    clip-path: polygon(55% 0, 72% 44%, 100% 58%, 100% 100%, 0 100%, 0 0);
    background: linear-gradient(84deg, var(--front-shadow) 0%, var(--front-shadow) 10%, var(--front) 12%, var(--front) 100%);
}
.truck-button .truck .front:before, .truck-button .truck .front:after { content: ''; position: absolute; }
.truck-button .truck .front:before {
    width: 7px; height: 8px; background: #fff; left: 7px; top: 2px;
    -webkit-clip-path: polygon(0 0, 60% 0%, 100% 100%, 0% 100%); clip-path: polygon(0 0, 60% 0%, 100% 100%, 0% 100%);
    background: linear-gradient(59deg, var(--window) 0%, var(--window) 57%, var(--window-shadow) 55%, var(--window-shadow) 100%);
}
.truck-button .truck .front:after { width: 3px; height: 2px; right: 0; bottom: 3px; background: var(--front-light); }
.truck-button .truck .box {
    width: 13px; height: 13px; right: 56px; bottom: 0; z-index: 1; border-radius: 1px; overflow: hidden;
    transform: translate(calc(var(--box-x, -24) * 1px), calc(var(--box-y, -6) * 1px)) scale(var(--box-s, .5));
    opacity: var(--box-o, 0); background: linear-gradient(68deg, var(--box) 0%, var(--box) 50%, var(--box-shadow) 50.2%, var(--box-shadow) 100%);
    background-size: 250% 100%; background-position-x: calc(var(--bx, 0) * 1%);
}
.truck-button .truck .box:before, .truck-button .truck .box:after { content: ''; position: absolute; }
.truck-button .truck .box:before { content: ''; background: rgba(255,255,255,.2); left: 0; right: 0; top: 6px; height: 1px; }
.truck-button .truck .box:after { width: 6px; left: 100%; top: 0; bottom: 0; background: var(--back); transform: translateX(calc(var(--hx, 0) * 1px)); }
.truck-button.animation { --rx: -90deg; --br: 0; }
.truck-button.animation .default { --o: 0; }
.truck-button.animation.done { --rx: 0deg; --br: 15px; --br-d: .2s; }
.truck-button.animation.done .success { --o: 1; --offset: 0; }
`;

const TruckButton = ({ onClick }) => {
  const [status, setStatus] = useState('default');
  const buttonRef = useRef(null);
  const boxRef = useRef(null);
  const truckRef = useRef(null);

  const handleClick = (e) => {
      e.preventDefault();
      if (status !== 'default') return;
      setStatus('animation');
      const btn = buttonRef.current;
      const box = boxRef.current;
      const truck = truckRef.current;

      animate(btn, { "--box-s": 1, "--box-o": 1 }, { duration: 0.3, delay: 0.5 });
      animate(box, { x: 0 }, { duration: 0.4, delay: 0.7 });
      animate(btn, { "--hx": -5, "--bx": 50 }, { duration: 0.18, delay: 0.92 });
      animate(box, { y: 0 }, { duration: 0.1, delay: 1.15 });

      setTimeout(() => {
          btn.style.setProperty('--truck-y', '0');
          btn.style.setProperty('--truck-y-n', '-26');
          animate(btn, { "--truck-y": 1, "--truck-y-n": -25 }, { duration: 0.2 });
      }, 1250);

      setTimeout(() => {
          setStatus('done');
          const driveSequence = async () => {
              await animate(truck, { x: 0 }, { duration: 0.4 });
              await animate(truck, { x: 40 }, { duration: 1.0 });
              await animate(truck, { x: 20 }, { duration: 0.6 });
              await animate(truck, { x: 96 }, { duration: 0.4 });
          };
          driveSequence();
          animate(btn, { "--progress": 1 }, { duration: 2.4, ease: "easeIn", onComplete: onClick });
      }, 1450);
  };

  return (
      <button ref={buttonRef} className={`truck-button ${status}`} onClick={handleClick}>
          <span className="default">Complete Order</span>
          <span className="success">Order Placed<svg viewBox="0 0 12 10"><polyline points="1.5 6 4.5 9 10.5 1"></polyline></svg></span>
          <div className="truck" ref={truckRef}>
              <div className="wheel"></div><div className="back"></div><div className="front"></div><div className="box" ref={boxRef}></div>
          </div>
      </button>
  )
};

const PaymentCardForm = ({ onComplete }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardMonth, setCardMonth] = useState('');
  const [cardYear, setCardYear] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const minYear = new Date().getFullYear();

  const handleNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    setCardNumber(val.match(/.{1,4}/g)?.join(' ') || '');
  };

  const getCardType = () => {
    if (/^4/.test(cardNumber)) return 'visa';
    if (/^(34|37)/.test(cardNumber)) return 'amex';
    if (/^5[1-5]/.test(cardNumber)) return 'mastercard';
    if (/^6011/.test(cardNumber)) return 'discover';
    return 'visa';
  };

  return (
    <div className="w-full flex justify-center py-4">
      <style dangerouslySetInnerHTML={{ __html: paymentCss }} />
      <div className="w-full max-w-xl mx-auto relative z-10">
        <div className={`card-item ${isFlipped ? '-active' : ''} relative mx-auto w-full max-w-[430px] aspect-[43/27] z-20`}>
           <div className="card-item__side -front absolute top-0 left-0 w-full h-full rounded-[15px] overflow-hidden shadow-2xl bg-[#1c1d27]">
              <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/6.jpeg" className="absolute top-0 left-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
              <div className="relative z-10 p-4 sm:p-6 text-white h-full flex flex-col justify-between font-mono">
                  <div className="flex justify-between items-start"><img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/chip.png" className="w-10 sm:w-14" /><img src={`https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/${getCardType()}.png`} className="h-6 sm:h-10 object-contain" /></div>
                  <div>
                     <div className="text-xl sm:text-3xl tracking-[0.2em] mb-2 sm:mb-6">{cardNumber || '#### #### #### ####'}</div>
                     <div className="flex justify-between">
                        <div><div className="text-[8px] sm:text-[10px] opacity-70 uppercase tracking-widest">Card Holder</div><div className="text-sm sm:text-lg uppercase tracking-widest truncate max-w-[150px] sm:max-w-[200px]">{cardName || 'FULL NAME'}</div></div>
                        <div><div className="text-[8px] sm:text-[10px] opacity-70 uppercase tracking-widest">Expires</div><div className="text-sm sm:text-lg tracking-widest">{cardMonth || 'MM'}/{cardYear ? cardYear.slice(2) : 'YY'}</div></div>
                     </div>
                  </div>
              </div>
           </div>
           <div className="card-item__side -back absolute top-0 left-0 w-full h-full rounded-[15px] overflow-hidden shadow-2xl bg-[#1c1d27]">
              <img src="https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/6.jpeg" className="absolute top-0 left-0 w-full h-full object-cover opacity-60 mix-blend-overlay" />
              <div className="relative z-10 h-full flex flex-col justify-center font-mono"><div className="w-full h-12 bg-black/80 mb-6"></div><div className="px-6 text-right"><div className="text-[10px] text-white opacity-70 uppercase tracking-widest mb-1">CVV</div><div className="bg-white text-black h-10 flex items-center justify-end px-4 rounded text-lg tracking-[0.3em]">{cardCvv.replace(/./g, '*')}</div></div><div className="px-6 flex justify-end mt-6"><img src={`https://raw.githubusercontent.com/muhammederdem/credit-card-form/master/src/assets/images/${getCardType()}.png`} className="h-8 object-contain opacity-70" /></div></div>
           </div>
        </div>
        <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl p-6 sm:p-8 pt-24 sm:pt-32 -mt-16 sm:-mt-24 relative z-10 border border-slate-100 dark:border-slate-800">
           <div className="space-y-6">
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Card Number</label><input type="text" value={cardNumber} onChange={handleNumberChange} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold" /></div>
              <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Card Holder</label><input type="text" value={cardName} onChange={e => setCardName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold uppercase" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:items-end">
                 <div className="sm:col-span-2 grid grid-cols-2 gap-4"><div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Expiration</label><select value={cardMonth} onChange={e => setCardMonth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold appearance-none"><option value="" disabled>Month</option>{[...Array(12)].map((_, i) => <option key={i} value={i+1 < 10 ? `0${i+1}` : i+1}>{i+1 < 10 ? `0${i+1}` : i+1}</option>)}</select></div><div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 opacity-0 hidden sm:block">Year</label><select value={cardYear} onChange={e => setCardYear(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold appearance-none"><option value="" disabled>Year</option>{[...Array(12)].map((_, i) => <option key={i} value={minYear + i}>{minYear + i}</option>)}</select></div></div>
                 <div><label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">CVV</label><input type="text" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} onFocus={() => setIsFlipped(true)} onBlur={() => setIsFlipped(false)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-bold" /></div>
              </div>
              <div className="pt-6 flex justify-center"><TruckButton onClick={onComplete} /></div>
           </div>
        </div>
      </div>
    </div>
  )
};

const CheckoutView = ({ setCurrentView }) => {
  const { state, dispatch } = useContext(StoreContext);
  const [shipping, setShipping] = useState(10);
  const [showPayment, setShowPayment] = useState(false);
  const cartTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const finalTotal = cartTotal + shipping + (cartTotal * 0.25);

  const handleOrderComplete = () => {
      dispatch({ type: 'PLACE_ORDER', payload: { total: finalTotal } });
      setCurrentView('home');
  };

  if (state.cart.length === 0) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-4">Your Bag is Empty</h2>
        <p className="text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest">Add some items before proceeding to checkout.</p>
      </div>
    );
  }

  if (showPayment) {
     return (
         <div className="container mx-auto px-6 py-12 max-w-6xl min-h-[80vh]">
             <div className="flex items-center gap-4 mb-8">
                 <button onClick={() => setShowPayment(false)} className="text-slate-400 hover:text-[#ff3c78] font-bold text-xs uppercase tracking-widest">Back</button>
                 <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Payment Details</h2>
             </div>
             <PaymentCardForm onComplete={handleOrderComplete} />
         </div>
     );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-6xl">
      <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-12">Checkout</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">1. Information</h3>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="FULL NAME" defaultValue={state.user?.username || ''} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black text-xs uppercase" />
                <input placeholder="COMPANY (OPTIONAL)" className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black text-xs uppercase" />
              </div>
              <input placeholder="FULL ADDRESS" defaultValue={state.user?.address || ''} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black text-xs uppercase" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="EMAIL" type="email" className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black text-xs uppercase" />
                <input placeholder="PHONE" type="tel" className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] text-slate-900 dark:text-white font-black text-xs uppercase" />
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">2. Shipping</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#ff3c78] transition-colors">
                <input type="radio" name="shipping" onChange={() => setShipping(10)} defaultChecked className="accent-[#ff3c78] w-4 h-4 cursor-pointer" />
                <span className="font-black text-xs uppercase dark:text-white tracking-widest">GLS - Door Delivery ($10.00)</span>
              </label>
              <label className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-[#ff3c78] transition-colors">
                <input type="radio" name="shipping" onChange={() => setShipping(12)} className="accent-[#ff3c78] w-4 h-4 cursor-pointer" />
                <span className="font-black text-xs uppercase dark:text-white tracking-widest">DHL - Company Delivery ($12.00)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Order Summary</h3>
            <div className="space-y-4 mb-8">
              {state.cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <img src={item.image} className="w-12 h-12 object-contain bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mix-blend-multiply dark:mix-blend-normal" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wide dark:text-white line-clamp-1 max-w-[180px]">{item.title}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <p className="font-black dark:text-white">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex justify-between font-black text-xs uppercase tracking-widest text-slate-500"><span>Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-xs uppercase tracking-widest text-slate-500"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-xs uppercase tracking-widest text-slate-500"><span>Tax (25%)</span><span>${(cartTotal * 0.25).toFixed(2)}</span></div>
              <div className="flex justify-between font-black text-xl uppercase tracking-tighter dark:text-white pt-4 border-t border-slate-100 dark:border-slate-800"><span>Total</span><span className="text-[#ff3c78]">${(cartTotal + shipping + (cartTotal * 0.25)).toFixed(2)}</span></div>
            </div>

            <div className="mt-8 space-y-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="accent-[#ff3c78] w-4 h-4 cursor-pointer" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">I accept the Terms and Conditions</span>
              </label>
              <button onClick={() => setShowPayment(true)} className="w-full bg-black dark:bg-[#ff3c78] text-white py-5 font-black uppercase tracking-widest hover:bg-[#ff3c78] transition-colors rounded-2xl shadow-xl text-xs">Pay with Credit Card</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const { state } = useContext(StoreContext);
  return (
    <footer className="bg-black pt-20 pb-10 text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div><img src="/Gemini_Generated_Image_7tu9lb7tu9lb7tu9.png" alt="logo" className="h-14 mb-8" /><p className="text-slate-400 text-sm leading-relaxed mb-8">The customer is at the heart of our<br/>unique business model, which includes<br/>design.</p><img src="https://i.postimg.cc/Nj9dgJ98/cards.png" alt="cards" className="h-6" /></div>
          <div><h4 className="font-black text-xs uppercase mb-8 tracking-[4px]">Shopping</h4><ul className="space-y-4 text-xs font-black uppercase text-slate-400 tracking-widest"><li><button className="hover:text-[#ff3c78]">Clothing Store</button></li><li><button className="hover:text-[#ff3c78]">Trending Shoes</button></li><li><button className="hover:text-[#ff3c78]">Accessories</button></li><li><button className="hover:text-[#ff3c78]">Sale</button></li></ul></div>
          <div><h4 className="font-black text-xs uppercase mb-8 tracking-[4px]">Support</h4><ul className="space-y-4 text-xs font-black uppercase text-slate-400 tracking-widest"><li><button className="hover:text-[#ff3c78]">Contact Us</button></li><li><button className="hover:text-[#ff3c78]">Payment Method</button></li><li><button className="hover:text-[#ff3c78]">Delivery Status</button></li><li><button className="hover:text-[#ff3c78]">Return and Exchange</button></li></ul></div>
          <div><h4 className="font-black text-xs uppercase mb-8 tracking-[4px]">Newsletter</h4><p className="text-slate-400 text-sm mb-8 font-medium">Be the first to know about new arrivals, look books, sales & promos!</p><div className="flex border-b border-white/20 pb-2 mb-4"><input type="email" placeholder="YOUR EMAIL" className="bg-transparent outline-none flex-1 text-xs font-black" /><Mail size={18} /></div></div>
        </div>
        <div className="border-t border-white/10 pt-10 text-center text-xs font-black uppercase tracking-widest text-slate-500"><p>Design and Code by ShopperHop Team &copy; 2024</p></div>
      </div>
    </footer>
  );
};

const App = () => {
  const [state, dispatch] = useReducer(storeReducer, initialState);
  const [currentView, setCurrentView] = useState('home');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (state.theme === 'dark') { root.classList.add('dark'); root.style.colorScheme = 'dark'; } 
    else { root.classList.remove('dark'); root.style.colorScheme = 'light'; }
  }, [state.theme]);

  const showToast = useCallback((message, type = 'success') => { setToast({ message, type }); }, []);
  useEffect(() => { ApiService.getProducts().then(data => { setProducts(data); setLoading(false); }).catch(() => showToast("API Error.", "error"));
}, []);

  const cartTotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      <div className={`min-h-screen transition-colors duration-300 ${state.theme === 'dark' ? 'dark bg-slate-950' : 'bg-white'}`}>
        <div className="min-h-screen bg-transparent selection:bg-[#ff3c78] selection:text-white">
          <Navbar onViewChange={setCurrentView} currentView={currentView} openCart={() => setIsCartOpen(true)} openLogin={() => setIsLoginOpen(true)} />
          <main className="min-h-screen">
            <AnimatePresence mode="wait">
              {currentView === 'home' && (
                <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <HomeView products={products} loading={loading} onShopNow={() => setCurrentView('shop')} onQuickView={setSelectedProduct} onAddCart={(p) => { dispatch({ type: 'ADD_TO_CART', payload: p }); showToast("Added to bag!"); }} onWishlist={(p) => { dispatch({ type: 'TOGGLE_WISHLIST', payload: p }); showToast("Wishlist updated!"); }} isWishlisted={(id) => !!state.wishlist.find(i => i.id === id)} />
                </motion.div>
              )}
              {currentView === 'shop' && (
                <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <ShopView products={products} loading={loading} onQuickView={setSelectedProduct} onAddCart={(p) => { dispatch({ type: 'ADD_TO_CART', payload: p }); showToast("Added to bag!"); }} onWishlist={(p) => { dispatch({ type: 'TOGGLE_WISHLIST', payload: p }); showToast("Wishlist updated!"); }} isWishlisted={(id) => !!state.wishlist.find(i => i.id === id)} />
                </motion.div>
              )}
              {currentView === 'profile' && (
                <motion.div key="profile" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <ProfileView />
                </motion.div>
              )}
              {currentView === 'checkout' && (
                <motion.div key="checkout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <CheckoutView setCurrentView={setCurrentView} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
          <Footer />

          <AnimatePresence>
            {isCartOpen && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 z-[101] h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-black text-white uppercase"><h2 className="!text-white text-xl font-black tracking-widest flex items-center gap-3 uppercase"><ShoppingCart size={24} />YOUR BAG</h2><button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X size={24} /></button></div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">{state.cart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-center space-y-4 uppercase"><ShoppingBag size={80} className="text-slate-100 dark:text-slate-800" /><h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Your bag is empty</h3><button onClick={() => {setIsCartOpen(false); setCurrentView('shop');}} className="bg-[#ff3c78] text-white px-8 py-3 font-bold rounded-full uppercase text-xs tracking-widest">Go Shopping</button></div>) : (state.cart.map(item => (<div key={item.id} className="flex gap-6 group border-b border-slate-50 dark:border-slate-800 pb-8"><div className="w-24 h-28 bg-slate-100 dark:bg-slate-800 rounded-xl p-3 flex-shrink-0"><img src={item.image} alt={item.title} className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal" /></div><div className="flex-1 min-w-0"><h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mb-2 uppercase tracking-wide">{item.title}</h4><p className="!text-white font-black text-lg mb-4">${item.price}</p><div className="flex items-center justify-between"><div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full"><button 
  disabled={item.quantity === 1}   // FIXED
  onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.id, q: item.quantity - 1 } })}
>
  <Minus size={14} />
</button><span className="font-black text-slate-900 dark:text-white w-4 text-center">{item.quantity}</span><button onClick={() => dispatch({ type: 'UPDATE_QUANTITY', payload: { id: item.id, q: item.quantity + 1 } })}><Plus size={14} className="text-slate-900 dark:text-white" /></button></div><button onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.id })} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button></div></div></div>)))}</div>
                  {state.cart.length > 0 && (<div className="p-8 border-t border-slate-100 dark:border-slate-800 space-y-6"><div className="flex justify-between items-center text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter"><span>Total</span><span className="!text-white">${cartTotal.toFixed(2)}</span></div><button onClick={() => { setIsCartOpen(false); setCurrentView('checkout'); }} className="w-full bg-black dark:bg-[#ff3c78] text-white py-5 font-black tracking-widest uppercase hover:bg-[#ff3c78] transition-colors shadow-2xl text-xs">Proceed to Checkout</button></div>)}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <Modal isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title="PRODUCT DETAILS">
            {selectedProduct && (<div className="flex flex-col md:flex-row gap-12 p-4"><div className="w-full md:w-1/2 aspect-square bg-[#f3f2ee] dark:bg-slate-800 rounded-3xl p-10 flex items-center justify-center"><img src={selectedProduct.image} alt={selectedProduct.title || "Product"} className="max-h-full drop-shadow-2xl mix-blend-multiply dark:mix-blend-normal" /></div><div className="w-full md:w-1/2 space-y-6"><span className="text-[#ff3c78] font-black tracking-widest uppercase text-[10px] border border-[#ff3c78] px-3 py-1 rounded-full">{selectedProduct.category}</span><h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">{selectedProduct.title}</h3><div className="flex items-center gap-4 py-2 border-y border-slate-100 dark:border-slate-800"><div className="flex items-center gap-1"><Star size={20} className="fill-amber-400 text-amber-400" /><span className="font-black text-xl text-slate-900 dark:text-white">{selectedProduct.rating?.rate || 0}</span></div><span className="text-slate-400 text-xs font-black uppercase tracking-widest">{selectedProduct.rating?.count || 0} Reviews</span></div><p className="text-slate-500 text-sm font-medium leading-relaxed uppercase tracking-tighter">{selectedProduct.description}</p><div className="text-4xl font-black !text-white tracking-tighter">${selectedProduct.price}</div><div className="pt-6"><button onClick={() => { dispatch({ type: 'ADD_TO_CART', payload: selectedProduct }); setSelectedProduct(null); showToast("Added to bag!"); }} className="w-full bg-black dark:bg-[#ff3c78] text-white py-5 font-black uppercase tracking-widest hover:bg-[#ff3c78] transition-all shadow-xl active:scale-95 text-xs">Add to Bag</button></div></div></div>)}
          </Modal>

          <Modal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Welcome Back">
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); dispatch({ type: 'LOGIN', payload: { username: fd.get('username') || 'Shopper' } }); setIsLoginOpen(false); showToast(`Logged in successfully!`); }} className="space-y-6 max-w-md mx-auto py-4"><div className="space-y-4"><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input name="username" required placeholder="USERNAME" className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] font-black text-slate-900 dark:text-white uppercase text-sm" /></div><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input name="password" required type="password" placeholder="PASSWORD" className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 rounded-xl outline-none focus:ring-2 ring-[#ff3c78] font-black text-slate-900 dark:text-white uppercase text-sm" /></div></div><button className="w-full bg-black dark:bg-[#ff3c78] text-white py-5 font-black tracking-widest uppercase hover:bg-[#ff3c78] transition-all shadow-xl text-xs">Log In</button></form>
          </Modal>

          <AnimatePresence>{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>
        </div>
      </div>
    </StoreContext.Provider>
  );
};

export default App;