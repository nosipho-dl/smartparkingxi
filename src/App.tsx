import { 
  Bell, 
  BookHeart, 
  CalendarCheck, 
  Car,
  CheckCircle,
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Info, 
  LayoutDashboard, 
  Map as MapIcon, 
  MapPin, 
  MessageSquare, 
  Navigation, 
  ParkingCircle,
  Search, 
  Star, 
  User, 
  Zap 
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useState } from 'react';

// --- Types ---
type Screen = 
  | 'login' 
  | 'home' 
  | 'zones' 
  | 'bays'
  | 'duration'
  | 'confirm' 
  | 'active' 
  | 'ai-suggestions' 
  | 'notifications' 
  | 'feedback'
  | 'profile'
  | 'overstay-prompt';

interface Bay {
  id: string;
  label: string;
  status: 'available' | 'occupied' | 'reserved' | 'selected';
}

interface Zone {
  id: string;
  name: string;
  campus: string;
  type: string;
  capacity: number;
  used: number;
  status: 'available' | 'limited' | 'full';
  location: string;
  distance: string;
  isFavorite?: boolean;
  bays: Bay[];
}

interface Booking {
  id: string;
  zoneId: string;
  zoneName: string;
  bayId: string;
  bayLabel: string;
  startTime: number;
  expiryTime: number;
  durationHours: number;
  status: 'pending' | 'confirmed' | 'expired' | 'completed';
}

interface PastBooking {
  id: string;
  zoneName: string;
  date: string;
  time: string;
  status: 'completed' | 'cancelled';
}

// --- Mock Data ---
const generateBays = (prefix: string, count: number): Bay[] => {
  return Array.from({ length: count }, (_, i) => {
    const row = String.fromCharCode(65 + Math.floor(i / 5));
    const num = (i % 5) + 1;
    const statusRand = Math.random();
    let status: Bay['status'] = 'available';
    if (statusRand > 0.8) status = 'occupied';
    else if (statusRand > 0.7) status = 'reserved';
    
    return {
      id: `${prefix}-bay-${i}`,
      label: `${row}${num}`,
      status
    };
  });
};

const INITIAL_ZONES: Zone[] = [
  { id: 'rs1', name: 'Woodhouse Entrance', campus: 'Riverside', type: 'Staff/Student', capacity: 20, used: 8, status: 'available', location: 'Riverside', distance: '0.2 km', bays: generateBays('rs1', 20) },
  { id: 'ind1', name: 'Res & Sports Centre', campus: 'Indumiso', type: 'Student', capacity: 20, used: 15, status: 'limited', location: 'Indumiso', distance: '0.5 km', bays: generateBays('ind1', 20) },
  { id: 'sb1', name: 'P2 Student', campus: 'Steve Biko', type: 'Student', capacity: 20, used: 20, status: 'full', location: 'Steve Biko', distance: '0.7 km', bays: generateBays('sb1', 20) },
  { id: 'mls1', name: 'North Parking', campus: 'ML Sultan', type: 'General', capacity: 20, used: 5, status: 'available', location: 'ML Sultan', distance: '1.2 km', bays: generateBays('mls1', 20) },
];

const MOCK_HISTORY: PastBooking[] = [
  { id: 'PB1', zoneName: 'Sports Centre', date: '2026-04-15', time: '10:30 AM', status: 'completed' },
  { id: 'PB2', zoneName: 'P3 Staff', date: '2026-04-14', time: '02:00 PM', status: 'completed' },
  { id: 'PB3', zoneName: 'Main Library', date: '2026-04-12', time: '09:15 AM', status: 'cancelled' },
];

const MOCK_ALERTS = [
  { id: 1, title: 'Zone Full', message: 'Main Library parking is now full.', time: '5m ago', type: 'error' },
  { id: 2, title: 'Booking Expiring', message: 'Your reservation at Sports Centre expires in 5 mins.', time: '10m ago', type: 'warning' },
  { id: 3, title: 'Better Parking', message: 'Science Lab has plenty of spaces available.', time: '30m ago', type: 'success' },
];

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '',
  disabled = false
}: { 
  children: ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  className?: string;
  disabled?: boolean;
}) => {
  const base = "px-6 py-3 rounded-lg font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 text-[13px] font-display uppercase tracking-widest";
  const variants = {
    primary: "bg-teal-br text-bg shadow-lg shadow-teal-br/20",
    secondary: "bg-teal-dim text-white border border-teal-mid/30",
    outline: "border border-teal-br text-teal-br hover:bg-teal-br/10",
    ghost: "bg-surface text-muted hover:text-white",
    danger: "bg-error text-white shadow-lg shadow-error/20",
    success: "bg-teal-br text-bg",
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Header = ({ 
  title, 
  showBack = false, 
  onBack, 
  onNotify 
}: { 
  title: string; 
  showBack?: boolean; 
  onBack?: () => void;
  onNotify?: () => void;
}) => (
  <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-surface border-b border-border z-30">
    <div className="flex items-center gap-3">
      {showBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-teal-br hover:bg-raised rounded-lg">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <h1 className="text-sm font-display uppercase tracking-[3px] text-white">{title}</h1>
    </div>
    <button onClick={onNotify} className="p-2 bg-card border border-border rounded-lg relative">
      <Bell className="w-5 h-5 text-muted" />
      <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-teal-br rounded-full border border-bg pulse-dot"></span>
    </button>
  </header>
);

const Badge = ({ status }: { status: Zone['status'] }) => {
  const configs = {
    available: { label: 'Open', color: 'bg-teal-dim/20 text-teal-br border border-teal-br/30' },
    limited: { label: 'Limited', color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    full: { label: 'Full', color: 'bg-error/20 text-error border border-error/30' },
  };
  const config = configs[status];
  return (
    <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest ${config.color}`}>
      {config.label}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [history, setHistory] = useState<Screen[]>(['login']);
  const [zones, setZones] = useState<Zone[]>(INITIAL_ZONES);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [selectedDurationHours, setSelectedDurationHours] = useState<number>(0);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBlockedUntil, setIsBlockedUntil] = useState<number | null>(null);

  const navigateTo = (target: Screen) => {
    setHistory(prev => [...prev, target]);
    setScreen(target);
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setScreen(prev);
  };

  // Real-time Simulation & Penalty check
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      setZones(prev => prev.map(z => {
        const delta = Math.floor(Math.random() * 3) - 1; 
        const newUsed = Math.min(z.capacity, Math.max(0, z.used + delta));
        const status = newUsed === z.capacity ? 'full' : newUsed > z.capacity * 0.9 ? 'limited' : 'available';
        
        // Randomly flip a few bay statuses
        const newBays = z.bays.map(b => {
          if (b.status === 'selected') return b;
          return Math.random() > 0.95 ? (b.status === 'available' ? 'occupied' : 'available') as Bay['status'] : b.status;
        }).map((status, i) => i < z.bays.length ? { ...z.bays[i], status: typeof status === 'string' ? status : status.status } : z.bays[i]);

        return { ...z, used: newUsed, status, bays: newBays };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // Timer logic for bookings & overstay
  useEffect(() => {
    let interval: number;
    if (activeBooking) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((activeBooking.expiryTime - now) / 1000));
        setTimeLeft(remaining);

        if (remaining === 0) {
          if (activeBooking.status === 'pending') {
            setActiveBooking(prev => prev ? { ...prev, status: 'expired' } : null);
            // Lock the bay back in the zone
            setZones(prev => prev.map(z => z.id === activeBooking.zoneId ? {
              ...z,
              bays: z.bays.map(b => b.id === activeBooking.bayId ? { ...b, status: 'available' } : b)
            } : z));
          } else if (activeBooking.status === 'confirmed') {
             // Overstay logic
             if (activeBooking.durationHours >= 8 && screen !== 'overstay-prompt') {
                navigateTo('overstay-prompt');
             }
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeBooking, screen]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    navigateTo('home');
  };

  const handleReserve = (zone: Zone) => {
    if (zone.status === 'full') {
      setSelectedZone(zone);
      navigateTo('ai-suggestions');
      return;
    }
    setSelectedZone(zone);
    navigateTo('bays');
  };

  const selectBay = (bay: Bay) => {
    if (bay.status !== 'available') return;
    setSelectedBay(bay);
  };

  const proceedToDuration = () => {
    if (!selectedBay) return;
    navigateTo('duration');
  };

  const confirmReservation = () => {
    if (!selectedZone || !selectedBay || !selectedDurationHours) return;
    
    const booking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      zoneId: selectedZone.id,
      zoneName: selectedZone.name,
      bayId: selectedBay.id,
      bayLabel: selectedBay.label,
      startTime: Date.now(),
      expiryTime: Date.now() + (15 * 60 * 1000), // 15 mins to check in
      durationHours: selectedDurationHours,
      status: 'pending'
    };

    // Lock the bay
    setZones(prev => prev.map(z => z.id === selectedZone.id ? {
      ...z,
      bays: z.bays.map(b => b.id === selectedBay.id ? { ...b, status: 'reserved' } : b)
    } : z));

    setActiveBooking(booking);
    navigateTo('confirm');
  };

  const cancelBooking = () => {
    if (activeBooking) {
      setZones(prev => prev.map(z => z.id === activeBooking.zoneId ? {
        ...z,
        bays: z.bays.map(b => b.id === activeBooking.bayId ? { ...b, status: 'available' } : b)
      } : z));
    }
    setActiveBooking(null);
    navigateTo('home');
  };

  const checkIn = () => {
    if (activeBooking) {
      // Once checked in, expiry time is set based on selected duration
      const expiry = Date.now() + (activeBooking.durationHours * 60 * 60 * 1000);
      setActiveBooking({ ...activeBooking, status: 'confirmed', startTime: Date.now(), expiryTime: expiry });
      
      // Update bay to occupied
      setZones(prev => prev.map(z => z.id === activeBooking.zoneId ? {
        ...z,
        bays: z.bays.map(b => b.id === activeBooking.bayId ? { ...b, status: 'occupied' } : b)
      } : z));
      
      navigateTo('active');
    }
  };

  const checkOut = () => {
    if (activeBooking) {
        // Free the bay
        setZones(prev => prev.map(z => z.id === activeBooking.zoneId ? {
            ...z,
            bays: z.bays.map(b => b.id === activeBooking.bayId ? { ...b, status: 'available' } : b)
        } : z));

        // Penalty check: if expired and overstayed
        if (timeLeft === 0 && activeBooking.status === 'confirmed') {
            const blockedUntil = Date.now() + (24 * 60 * 60 * 1000); // 1 day penalty
            setIsBlockedUntil(blockedUntil);
        }
    }
    setActiveBooking(null);
    navigateTo('home');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Render Screens ---

  const renderLogin = () => (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-8 py-12 text-white">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 text-center"
      >
        <div className="w-[64px] h-[64px] bg-teal-dim rounded-[18px] mx-auto mb-[20px] flex items-center justify-center shadow-2xl border border-teal-br/20">
          <BookHeart className="w-8 h-8 text-teal-br" />
        </div>
        <h2 className="text-[32px] font-display text-white uppercase tracking-tighter">
          SCRATCH <span className="text-teal-br">XI</span>
        </h2>
        <p className="text-[10px] text-muted font-sans uppercase tracking-[2px] mt-2">Smart Campus Parking System</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-6 max-w-xs mx-auto w-full"
      >
        <div className="space-y-4">
          <div className="relative">
             <input 
              type="email" 
              placeholder="Student ID / Email" 
              className="w-full bg-surface border border-border rounded-[10px] px-5 py-4 text-sm focus:border-teal-br/50 border transition-all outline-hidden text-white placeholder:text-dim"
            />
          </div>
          <div className="relative">
             <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-surface border border-border rounded-[10px] px-5 py-4 text-sm focus:border-teal-br/50 border transition-all outline-hidden text-white placeholder:text-dim"
            />
          </div>
        </div>
        
        <Button onClick={handleLogin} className="w-full mt-2 !rounded-[12px] py-5 shadow-2xl">
          Enter Console
        </Button>
        
        <div className="flex justify-between items-center text-[10px] font-bold text-muted uppercase tracking-widest px-1">
          <span className="cursor-pointer hover:text-teal-br transition-colors">Forgot Access</span>
          <span onClick={handleLogin} className="cursor-pointer hover:text-teal-br transition-colors">Guest Entry</span>
        </div>
      </motion.div>
    </div>
  );

  const renderHome = () => {
    const availableTotal = zones.reduce((acc, z) => acc + (z.capacity - z.used), 0);
    const isPenaltyActive = isBlockedUntil && isBlockedUntil > Date.now();

    return (
      <div className="pb-24 bg-bg">
        <Header title="Smart Dashboard" onNotify={() => navigateTo('notifications')} />
        
        <main className="px-6 py-6 space-y-8">
          <section className="flex justify-between items-end">
             <div className="space-y-1">
                <p className="text-[9px] font-sans font-bold text-dim uppercase tracking-[3px]">Authorized Operator</p>
                <h3 className="text-xl font-display text-white">Alex Henderson</h3>
             </div>
             <div className="w-11 h-11 bg-surface border border-border rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-teal-br" />
             </div>
          </section>

          {isPenaltyActive && (
            <motion.section 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-5 bg-error/10 border border-error/30 rounded-2xl flex items-center gap-4"
            >
              <div className="w-10 h-10 bg-error/20 rounded-xl flex items-center justify-center shrink-0">
                 <Info className="w-5 h-5 text-error" />
              </div>
              <div className="flex-1">
                 <h4 className="font-display text-error text-[12px] uppercase tracking-wider">Breach Detected</h4>
                 <p className="text-[10px] text-error/60 font-sans">Overstay penalty active. Next window in 24h.</p>
              </div>
            </motion.section>
          )}

          {/* Environmental Sensors Section */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-surface border border-border p-5 rounded-3xl space-y-4">
                <div className="flex justify-between items-start">
                   <div className="w-8 h-8 bg-raised border border-border rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-teal-br" />
                   </div>
                   <div className="w-2 h-2 rounded-full pulse-dot"></div>
                </div>
                <div>
                   <p className="text-[20px] font-display text-white">{availableTotal}</p>
                   <p className="text-[8px] font-bold text-muted uppercase tracking-widest">Available Spots</p>
                </div>
             </div>
             
             <button onClick={() => navigateTo('notifications')} className="bg-surface border border-border p-5 rounded-3xl space-y-4 text-left">
                <div className="flex justify-between items-start">
                   <div className="w-8 h-8 bg-raised border border-border rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-muted" />
                   </div>
                </div>
                <div>
                   <p className="text-[20px] font-display text-white">3</p>
                   <p className="text-[8px] font-bold text-muted uppercase tracking-widest">Active Alerts</p>
                </div>
             </button>
          </div>

          {/* Core Controls */}
          <section className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-display text-white uppercase tracking-[3px]">Console Ops</h4>
                <div className="w-6 h-px bg-border"></div>
             </div>
             
             <button 
                onClick={() => !isPenaltyActive && navigateTo('zones')}
                disabled={isPenaltyActive}
                className={`w-full group relative overflow-hidden bg-card border border-border rounded-[20px] p-6 flex flex-col gap-5 transition-all active:scale-[0.97] ${isPenaltyActive ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-teal-dim'}`}
             >
                <div className="flex justify-between items-start w-full relative z-10">
                   <div className="w-12 h-12 bg-raised border border-border rounded-xl flex items-center justify-center">
                      <Navigation className="w-6 h-6 text-teal-br" />
                   </div>
                   <div className="h-6 w-11 bg-raised border border-border rounded-full p-1 flex items-center">
                      <div className="w-4 h-4 bg-teal-br rounded-full shadow-[0_0_8px_rgba(0,0,13,0.5)]"></div>
                   </div>
                </div>
                <div className="text-left relative z-10">
                   <p className="text-[12px] font-bold text-white mb-0.5">Initialize Parking Search</p>
                   <p className="text-[10px] text-muted font-sans font-light">Locate and reserve bay in neural map</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-br/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-teal-br/10 transition-all"></div>
             </button>
          </section>

          {activeBooking && (
            <motion.section 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="space-y-4"
            >
              <h4 className="text-[10px] font-display text-white uppercase tracking-[3px]">Active Comm</h4>
              <div 
                onClick={() => navigateTo('active')}
                className="bg-card border-2 border-teal-dim rounded-3xl p-6 relative overflow-hidden cursor-pointer"
              >
                <div className="relative z-10 flex justify-between items-center">
                   <div className="space-y-5">
                      <div>
                        <h4 className="text-lg font-display text-white">{activeBooking.zoneName}</h4>
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-teal-br pulse-dot"></div>
                           <p className="text-[9px] text-teal-br font-bold uppercase tracking-[2px]">Bay {activeBooking.bayLabel}</p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                         <div>
                            <p className="text-[7px] font-bold text-dim uppercase tracking-wider mb-0.5">Duration</p>
                            <p className="text-[11px] font-display text-white">{activeBooking.durationHours}h</p>
                         </div>
                         <div>
                            <p className="text-[7px] font-bold text-dim uppercase tracking-wider mb-0.5">Expiry</p>
                            <p className="text-[11px] font-display text-teal-br">
                               {new Date(activeBooking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                   </div>
                   <div className="w-20 h-20 relative flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                         <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-raised" />
                         <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="201" strokeDashoffset={201 - (201 * (timeLeft / (activeBooking.durationHours * 3600)))} strokeLinecap="round" className="text-teal-br transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-[11px] font-display text-white leading-none">{formatTime(timeLeft)}</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.section>
          )}
        </main>
  
        <nav className="fixed bottom-6 left-6 right-6 bg-surface border border-border rounded-[24px] px-6 py-3 flex items-center justify-between z-40 shadow-2xl">
          {[
            { s: 'home' as Screen, i: LayoutDashboard },
            { s: 'zones' as Screen, i: MapIcon },
            { s: 'active' as Screen, i: CalendarCheck },
            { s: 'profile' as Screen, i: User }
          ].map(tab => (
            <button 
               key={tab.s}
               onClick={() => navigateTo(tab.s)} 
               className={`p-3 rounded-xl transition-all ${screen === tab.s ? 'bg-teal-br text-bg shadow-lg shadow-teal-br/20 scale-110' : 'text-muted hover:text-white'}`}
            >
              <tab.i className={`w-5 h-5 ${screen === tab.s ? 'stroke-3' : 'stroke-2'}`} />
            </button>
          ))}
        </nav>
      </div>
    );
  };
;

  const renderParkingZones = () => (
    <div className="pb-24 bg-bg">
      <Header title="Neural Map" showBack onBack={goBack} onNotify={() => navigateTo('notifications')} />
      
      <main className="px-6 py-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search zones..." 
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-4 text-xs font-sans outline-hidden focus:border-teal-br/50 transition-all text-white placeholder:text-dim"
          />
        </div>

        <div className="flex gap-3 pb-2 overflow-x-auto scrollbar-hide">
          {['All', 'Riverside', 'Indumiso', 'Steve Biko', 'Ritson', 'ML Sultan'].map(tag => (
            <button 
              key={tag} 
              className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                ${tag === 'All' ? 'bg-teal-br text-bg shadow-md' : 'bg-surface border border-border text-muted'}
              `}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {zones.map(zone => (
            <motion.div 
              layoutId={zone.id}
              key={zone.id} 
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all hover:border-teal-dim active:bg-raised"
              onClick={() => handleReserve(zone)}
            >
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h4 className="text-[14px] font-display text-white">{zone.name}</h4>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-muted uppercase tracking-widest">
                     <MapPin className="w-3 h-3 text-teal-br" />
                     {zone.campus} Terminal
                  </div>
                </div>
                <Badge status={zone.status} />
              </div>

              <div className="flex justify-between items-end relative z-10">
                <div className="flex-1 space-y-2 max-w-[140px]">
                   <div className="w-full h-1 bg-raised rounded-full overflow-hidden">
                     <motion.div 
                        initial={false}
                        animate={{ width: `${(zone.used / zone.capacity) * 100}%` }}
                        className={`h-full ${zone.status === 'full' ? 'bg-error' : 'bg-teal-br'}`}
                     />
                   </div>
                   <p className="text-[8px] font-black text-dim uppercase tracking-tighter italic">
                     {zone.status === 'full' ? 'Capacity compromised' : `Node status: ${zone.capacity - zone.used} free units`}
                   </p>
                </div>
                <p className="text-[12px] font-display text-white leading-none">
                   {zone.distance}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-br/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );

  const renderBayGrid = () => {
    // Group bays by row (first character of label)
    const baysByRow: Record<string, Bay[]> = {};
    selectedZone?.bays.forEach(bay => {
      const row = bay.label.charAt(0);
      if (!baysByRow[row]) baysByRow[row] = [];
      baysByRow[row].push(bay);
    });

    const rows = Object.keys(baysByRow).sort();

    return (
      <div className="min-h-screen pb-24 bg-bg">
        <Header title="Neural Grid" showBack onBack={goBack} />
        
        <main className="px-6 py-6 flex flex-col gap-8">
          {/* Legend Section */}
          <section className="bg-surface border border-border p-5 rounded-3xl grid grid-cols-2 gap-y-4 gap-x-8">
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-teal-br/10 border border-teal-br/20 flex items-center justify-center">
                   <div className="w-2.5 h-2.5 bg-teal-br rounded-sm"></div>
                </div>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Available</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-error/10 border border-error/20 flex items-center justify-center">
                   <div className="w-4 h-4 text-error">
                      <Car className="w-full h-full" />
                   </div>
                </div>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Occupied</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
                   <div className="w-2.5 h-2.5 bg-muted rounded-sm"></div>
                </div>
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Reserved</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md bg-teal-br flex items-center justify-center shadow-[0_0_12px_rgba(0,132,13,0.3)]">
                   <ParkingCircle className="w-4 h-4 text-bg" />
                </div>
                <span className="text-[9px] font-black text-teal-br uppercase tracking-widest">Selected</span>
             </div>
          </section>

          {/* Map/Grid Section */}
          <div className="bg-surface border border-border rounded-[40px] p-6 space-y-12 overflow-y-auto max-h-[500px] scrollbar-hide">
            {rows.map((rowName, idx) => (
              <div key={rowName} className="relative">
                {/* Visual "Lane" Indicator after rows (except last) */}
                {idx > 0 && (
                   <div className="absolute inset-x-0 -top-8 h-px bg-linear-to-r from-transparent via-border to-transparent"></div>
                )}
                
                <div className="flex items-start gap-5">
                  {/* Row Label */}
                  <div className="w-[44px] flex flex-col items-center justify-center py-4 bg-raised border border-border rounded-xl shrink-0">
                     <span className="text-[8px] font-bold text-dim uppercase tracking-widest mb-1 leading-none">Row</span>
                     <span className="text-xl font-display text-teal-br leading-none">{rowName}</span>
                  </div>

                  {/* Bay Items */}
                  <div className="flex-1 grid grid-cols-5 gap-3">
                    {baysByRow[rowName].map(bay => (
                      <motion.button
                        key={bay.id}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        animate={selectedBay?.id === bay.id ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                        onClick={() => selectBay(bay)}
                        className={`relative w-full aspect-[3/4.5] rounded-xl flex flex-col items-center justify-between p-2 pb-1.5 border-2 transition-all overflow-hidden
                          ${bay.status === 'occupied' ? 'bg-bg/20 border-border opacity-30 grayscale' : 
                            bay.status === 'reserved' ? 'bg-card border-border/10' : 
                            selectedBay?.id === bay.id ? 'bg-teal-br border-teal-br shadow-[0_0_20px_rgba(0,201,141,0.2)]' : 
                            'bg-card border-border hover:border-teal-dim'}
                        `}
                      >
                        {/* Bay ID Label */}
                        <span className={`text-[8px] font-bold ${selectedBay?.id === bay.id ? 'text-bg/60' : 'text-dim'}`}>
                           {bay.label}
                        </span>

                        {/* Centered Icon */}
                        <div className="flex-1 flex items-center justify-center w-full">
                           {bay.status === 'occupied' ? (
                              <Car className="w-8 h-8 text-white/10" />
                           ) : bay.status === 'reserved' ? (
                              <div className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse"></div>
                           ) : selectedBay?.id === bay.id ? (
                              <ParkingCircle className="w-9 h-9 text-bg" />
                           ) : (
                              <div className="w-[2px] h-[70%] bg-border/20 rounded-full"></div>
                           )}
                        </div>

                        {/* Bottom Status Dot */}
                        <div className={`w-full h-1 rounded-full ${bay.status === 'occupied' ? 'bg-error' : bay.status === 'reserved' ? 'bg-muted' : selectedBay?.id === bay.id ? 'bg-bg' : 'bg-teal-br/20'}`}></div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm/Select Drawer */}
          <AnimatePresence>
            {selectedBay && (
                <motion.div 
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: 50, opacity: 0 }}
                   className="bg-surface border border-teal-br rounded-[32px] flex items-center justify-between p-6 m-0 z-50 sticky bottom-4 shadow-2xl"
                >
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <h4 className="font-display text-white text-lg">Unit {selectedBay.label}</h4>
                      </div>
                      <p className="text-[10px] text-teal-br uppercase font-black tracking-widest">Active Link Detected</p>
                   </div>
                   <Button onClick={proceedToDuration} className="shadow-[0_0_20px_rgba(0,201,141,0.4)]">
                      Connect
                   </Button>
                </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  const renderDurationSelect = () => (
    <div className="min-h-screen pb-24 bg-bg">
      <Header title="Session Timer" showBack onBack={goBack} />
      <main className="px-6 py-8 space-y-12">
        <div className="space-y-2">
            <h3 className="text-2xl font-display text-white">Define Session</h3>
            <p className="text-muted text-sm font-sans">Initialize access window duration.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
           {[
              { h: 1, label: 'Standard Protocol', range: '1.0 Hour', desc: 'Short-term diagnostic stay' },
              { h: 4, label: 'Extended Logic', range: '4.0 Hours', desc: 'Medium-term research window' },
              { h: 8, label: 'Full Shift Cycle', range: '8.0 Hours', desc: 'Maximum operational limit' }
           ].map(opt => (
              <button 
                key={opt.h}
                onClick={() => setSelectedDurationHours(opt.h)}
                className={`p-6 rounded-[24px] border-2 text-left transition-all relative overflow-hidden group
                  ${selectedDurationHours === opt.h ? 'bg-card border-teal-br' : 'bg-surface border-border'}
                `}
              >
                <div className="flex justify-between items-center relative z-10">
                   <div className="space-y-1">
                      <p className={`text-[10px] font-black uppercase tracking-widest ${selectedDurationHours === opt.h ? 'text-teal-br' : 'text-dim'}`}>
                         {opt.label}
                      </p>
                      <h4 className="font-display text-white text-xl">{opt.range}</h4>
                      <p className="text-[10px] text-muted">{opt.desc}</p>
                   </div>
                   <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${selectedDurationHours === opt.h ? 'bg-teal-br/10 border-teal-br/30' : 'bg-raised border-border'}`}>
                      <Clock className={`w-7 h-7 ${selectedDurationHours === opt.h ? 'text-teal-br' : 'text-muted'}`} />
                   </div>
                </div>
                {selectedDurationHours === opt.h && (
                   <div className="absolute top-0 right-0 w-24 h-24 bg-teal-br/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                )}
              </button>
           ))}
        </div>

        <div className="pt-8">
           <Button 
                className="w-full shadow-[0_0_30px_rgba(0,201,141,0.3)]" 
                disabled={!selectedDurationHours}
                onClick={confirmReservation}
           >
              Initialize Node Sync
           </Button>
        </div>
      </main>
    </div>
  );

  const renderConfirm = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 bg-bg text-center space-y-10">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-teal-br/10 border border-teal-br/30 rounded-[32px] flex items-center justify-center relative shadow-[0_0_40px_rgba(0,201,141,0.2)]"
      >
        <CheckCircle className="w-12 h-12 text-teal-br" />
        <div className="absolute inset-0 rounded-[32px] border-2 border-teal-br animate-ping opacity-20"></div>
      </motion.div>

      <div className="space-y-4">
        <h2 className="text-3xl font-display text-white">SYNC <span className="text-teal-br text-[24px]">COMPLETE</span></h2>
        <p className="text-muted text-sm font-sans max-w-[240px] mx-auto leading-relaxed">
           Reservation finalized at <span className="text-white font-bold">{selectedZone?.name}</span>. Network confirmed for bay <span className="text-teal-br font-bold">{selectedBay?.label}</span>.
        </p>
      </div>

      <div className="bg-surface border border-border p-6 rounded-[28px] w-full space-y-4">
         <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-dim px-2">
            <span>Terminal Security Code</span>
            <div className="w-1.5 h-1.5 rounded-full bg-teal-br pulse-dot"></div>
         </div>
         <div className="bg-raised border border-border rounded-2xl py-6 flex flex-col items-center gap-2">
            <span className="text-4xl font-display text-white tracking-[8px]">XI-904</span>
            <span className="text-[10px] font-sans text-muted">15 MINUTE ARRIVAL WINDOW</span>
         </div>
      </div>

      <Button onClick={() => navigateTo('home')} className="w-full">
        Home Control
      </Button>
    </div>
  );

  const renderActive = () => (
    <div className="pb-24 bg-bg">
      <Header title="Neural Link" showBack onBack={goBack} />
      
      <main className="px-6 py-6 space-y-8">
        {!activeBooking ? (
          <div className="py-20 text-center space-y-6">
            <div className="w-20 h-20 bg-surface border border-border rounded-full mx-auto flex items-center justify-center text-dim">
              <CalendarCheck className="w-10 h-10" />
            </div>
            <div className="space-y-2">
               <h3 className="text-white font-display text-lg">No Active Nodes</h3>
               <p className="text-muted text-xs font-sans">Initialize a booking to see ticket.</p>
            </div>
            <Button onClick={() => navigateTo('zones')}>Open Neural Map</Button>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-[40px] border border-border text-center relative overflow-hidden shadow-2xl">
               <div className="bg-teal-br p-8 text-bg space-y-2">
                   <h4 className="text-[10px] uppercase font-black tracking-[0.4em] opacity-40 italic">Active Operational Token</h4>
                   <h2 className="text-3xl font-display leading-tight">{activeBooking.zoneName}</h2>
                   <div className="flex items-center justify-center gap-2 pt-2">
                      <div className="px-3 py-1 bg-bg/10 rounded-full border border-bg/20">
                         <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Bay {activeBooking.bayLabel}</span>
                      </div>
                      <div className="px-3 py-1 bg-bg/10 rounded-full border border-bg/20">
                         <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Lvl 0{Math.floor(Math.random() * 3) + 1}</span>
                      </div>
                   </div>
               </div>

               <div className="p-10 space-y-12">
                  <div className="grid grid-cols-2 gap-8 text-left">
                     <div className="p-4 bg-raised border border-border rounded-2xl">
                        <p className="text-[8px] font-bold text-dim uppercase tracking-widest mb-1.5">Launch Time</p>
                        <p className="text-xl font-display text-white">{new Date(activeBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div className="p-4 bg-error/5 border border-error/20 rounded-2xl">
                        <p className="text-[8px] font-bold text-error/60 uppercase tracking-widest mb-1.5">Deactivate</p>
                        <p className="text-xl font-display text-error">{new Date(activeBooking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>

                  {activeBooking.status === 'pending' ? (
                    <div className="space-y-8">
                        <div className="w-40 h-40 relative mx-auto flex flex-col items-center justify-center">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-raised" />
                              <circle 
                                 cx="80" cy="80" r="72" 
                                 stroke="currentColor" strokeWidth="8" fill="transparent" 
                                 strokeDasharray="452" 
                                 strokeDashoffset={452 - (452 * (timeLeft / (15 * 60)))} 
                                 strokeLinecap="round" 
                                 className="text-teal-br transition-all duration-1000" 
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-display text-white">{formatTime(timeLeft)}</span>
                              <span className="text-[8px] font-black text-dim uppercase tracking-widest mt-1">Check-in Window</span>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <Button className="w-full shadow-[0_0_20px_rgba(0,201,141,0.2)]" onClick={checkIn}>
                              Authorize Docking
                           </Button>
                           <Button variant="ghost" className="w-full text-dim hover:text-white" onClick={cancelBooking}>
                              Abort Operation
                           </Button>
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-10">
                       <div className="w-48 h-48 bg-raised border border-border rounded-[32px] mx-auto flex items-center justify-center p-6 group transition-all hover:border-teal-br/30">
                          <div className="grid grid-cols-6 gap-2">
                             {[...Array(36)].map((_, i) => (
                               <div key={i} className={`w-4 h-4 rounded-[2px] ${Math.random() > 0.4 ? 'bg-teal-br shadow-[0_0_5px_rgba(0,201,141,0.4)]' : 'bg-transparent border border-border/20'}`}></div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-2 h-2 rounded-full pulse-dot"></div>
                           <p className="text-[10px] font-black text-teal-br uppercase tracking-[4px]">Verified Active</p>
                        </div>
                        <Button className="w-full bg-error/10 border border-error/20 text-error hover:bg-error hover:text-white shadow-none" onClick={checkOut}>
                            Terminate Session (Release)
                        </Button>
                       </div>
                    </div>
                  )}
               </div>

               {/* Design Decoration */}
               <div className="absolute left-0 top-[220px] -translate-x-4 w-8 h-8 bg-bg rounded-full border border-border"></div>
               <div className="absolute right-0 top-[220px] translate-x-4 w-8 h-8 bg-bg rounded-full border border-border"></div>
            </div>
          </>
        )}
      </main>
    </div>
  );

  const renderOverstayPrompt = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-bg text-center space-y-12">
       <div className="w-24 h-24 bg-error/10 border border-error/30 rounded-[32px] flex items-center justify-center relative shadow-[0_0_40px_rgba(231,76,60,0.1)]">
          <Clock className="w-12 h-12 text-error animate-pulse" />
       </div>
       <div className="space-y-4">
          <h2 className="text-3xl font-display text-white italic">SESSION_EXPIRED</h2>
          <p className="text-muted text-sm font-sans max-w-[280px] leading-relaxed italic">
             Continuous 8.0 hour peak reached. Neural handshake disconnected for safety. Confirm status immediately.
          </p>
       </div>
       
       <div className="w-full space-y-4">
          <Button className="w-full shadow-[0_0_20px_rgba(0,201,141,0.2)]" onClick={() => navigateTo('home')}>
             Reinstate Link (Extend)
          </Button>
          <Button variant="ghost" className="w-full border border-border text-dim hover:text-white" onClick={checkOut}>
             Decommission Node
          </Button>
       </div>
    </div>
  );

  const renderAISuggestions = () => (
    <div className="pb-24 bg-bg">
      <Header title="Neural Suggest" showBack onBack={goBack} />
      
      <main className="px-6 py-8 space-y-10">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-teal-br/10 border border-teal-br/30 rounded-[32px] mx-auto flex items-center justify-center relative shadow-[0_0_40px_rgba(0,201,141,0.1)]">
            <Zap className="w-12 h-12 text-teal-br" />
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-teal-br pulse-dot"></div>
          </div>
          <div className="space-y-1">
             <h2 className="text-2xl font-display text-white">Zone Capacity Full</h2>
             <p className="text-muted text-[10px] uppercase font-black tracking-widest italic opacity-50">Analyzing Campus Grid Flow...</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] font-display text-white uppercase tracking-[3px]">Logical Diverts</h3>
          
          <div className="space-y-4">
            {zones.filter(z => z.status === 'available').slice(0, 2).map((zone, idx) => (
              <motion.div 
                key={zone.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:border-teal-dim transition-all"
              >
                <div className="relative z-10 flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                       <span className="w-6 h-6 border border-teal-br/30 text-teal-br flex items-center justify-center rounded-lg text-[10px] font-display bg-teal-br/5">
                         0{idx + 1}
                       </span>
                       <h4 className="font-display text-white text-lg">{zone.name}</h4>
                    </div>
                    <p className="text-[10px] text-muted font-sans uppercase tracking-widest">{zone.campus} • High Stability Node</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-teal-br pt-2 uppercase tracking-wide">
                       <Navigation className="w-3.5 h-3.5" />
                       {zone.distance} ETA
                    </div>
                  </div>
                  <Button onClick={() => handleReserve(zone)}>
                    Select
                  </Button>
                </div>
                {idx === 0 && (
                  <div className="absolute top-0 right-0 py-1 px-4 bg-teal-br/10 border-b border-l border-teal-br/30 text-teal-br text-[8px] font-black uppercase tracking-[3px] rounded-bl-xl italic">
                    Optimal Divert
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-surface border-l-4 border-l-teal-br border border-border rounded-2xl space-y-3 relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-1">
               <Zap className="w-3 h-3 text-teal-br fill-teal-br" />
               <h4 className="text-[10px] font-black text-teal-br uppercase tracking-widest">Global AI Insight</h4>
            </div>
            <p className="text-xs text-white/90 leading-relaxed font-sans italic">
              {selectedZone?.name} is saturated. Diverting to <strong>Sports Centre</strong>. Historical data indicates 94% availability window for next 45 minutes.
            </p>
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-br/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-teal-br/10 transition-all"></div>
        </div>
      </main>
    </div>
  );

  const renderNotifications = () => (
    <div className="min-h-screen pb-24 bg-bg">
      <Header title="Neural Feed" showBack onBack={goBack} />
      <div className="px-6 py-6 space-y-4">
        {MOCK_ALERTS.map((alert) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={alert.id} 
            className={`p-5 rounded-[24px] border bg-surface flex gap-5 transition-all hover:border-teal-dim/30 ${alert.type === 'error' ? 'border-error/20' : alert.type === 'warning' ? 'border-warning/20' : 'border-border'}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full mt-2.5 shrink-0 ${alert.type === 'error' ? 'bg-error shadow-[0_0_10px_rgba(231,76,60,0.5)]' : alert.type === 'warning' ? 'bg-warning shadow-[0_0_10px_rgba(241,196,15,0.5)]' : 'bg-teal-br shadow-[0_0_10px_rgba(0,201,141,0.5)]'}`}></div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-[13px] font-display text-white">{alert.title}</h4>
                <span className="text-[8px] text-dim font-black uppercase tracking-widest">{alert.time}</span>
              </div>
              <p className="text-[10px] text-muted font-sans leading-relaxed italic">{alert.message}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="min-h-screen pb-24 bg-bg">
      <Header title="Neural Feedback" showBack onBack={goBack} />
      <main className="px-6 py-8 space-y-10">
        <div className="space-y-4">
          <h2 className="text-2xl font-display text-white italic tracking-tight">Grid Analysis Report</h2>
          <p className="text-muted text-xs font-sans leading-relaxed">System relies on operator input for optimal data synchronization. Report anomalies discovered in physical space.</p>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-[9px] font-black uppercase text-dim tracking-[3px]">Target Node Access</label>
             <div className="relative">
                <select className="w-full bg-surface border border-border rounded-xl px-5 py-4 text-xs font-sans text-white outline-hidden appearance-none focus:border-teal-br/30 transition-all">
                   <option>Select terminal...</option>
                   {zones.map(z => <option key={z.id}>{z.name}</option>)}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dim rotate-90 pointer-events-none" />
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[9px] font-black uppercase text-dim tracking-[3px]">Visual Observation</label>
             <div className="grid grid-cols-2 gap-4">
                <button className="p-5 rounded-2xl bg-card border border-border text-center hover:border-teal-br/40 transition-all flex flex-col items-center gap-3 group">
                   <div className="w-2.5 h-2.5 bg-teal-br rounded-full pulse-dot"></div>
                   <span className="font-display text-white text-[12px] uppercase">Node Empty</span>
                </button>
                <button className="p-5 rounded-2xl bg-card border border-border text-center hover:border-error/40 transition-all flex flex-col items-center gap-3 group">
                   <div className="w-2.5 h-2.5 bg-error rounded-full shadow-[0_0_10px_rgba(231,76,60,0.5)]"></div>
                   <span className="font-display text-white text-[12px] uppercase">Node Saturated</span>
                </button>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[9px] font-black uppercase text-dim tracking-[3px]">Data Notes</label>
             <textarea 
               placeholder="Initialize anomaly description..." 
               className="w-full bg-surface border border-border rounded-2xl px-5 py-5 min-h-[140px] text-xs font-sans outline-hidden text-white placeholder:text-dim focus:border-teal-br/30 transition-all"
             ></textarea>
          </div>

          <div className="pt-4">
             <Button 
               className="w-full shadow-[0_0_20px_rgba(0,201,141,0.2)]" 
               onClick={() => {
                 navigateTo('home');
               }}
             >
               Broadcast Report
             </Button>
          </div>
        </div>
      </main>
    </div>
  );

  const renderProfile = () => (
    <div className="pb-24 bg-bg">
      <Header title="Console Profile" onNotify={() => navigateTo('notifications')} />
      
      <main className="px-6 py-6 space-y-10">
         <section className="text-center space-y-5 pb-4">
            <div className="w-28 h-28 bg-surface border-4 border-raised rounded-full mx-auto flex items-center justify-center relative shadow-2xl">
               <span className="text-4xl font-display text-teal-br">AH</span>
               <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-teal-br rounded-xl border-4 border-bg flex items-center justify-center">
                  <User className="w-4 h-4 text-bg" />
               </div>
            </div>
            <div className="space-y-1">
               <h2 className="text-2xl font-display text-white">Alex Henderson</h2>
               <p className="text-muted text-[10px] font-black uppercase tracking-[3px] italic">Access Lv.4 • Science Research</p>
            </div>
         </section>

         {activeBooking && (
           <section className="space-y-4">
             <h3 className="text-[10px] font-display text-white uppercase tracking-[3px]">Linked Reservation</h3>
             <motion.div 
               whileTap={{ scale: 0.98 }}
               className="bg-card border-2 border-teal-br/30 p-6 rounded-[32px] cursor-pointer relative overflow-hidden group" 
               onClick={() => navigateTo('active')}
             >
                <div className="flex justify-between items-start mb-4 relative z-10">
                   <div className="space-y-1">
                      <h4 className="font-display text-white text-lg">{activeBooking.zoneName}</h4>
                      <p className="text-[9px] text-teal-br font-black uppercase tracking-widest italic">Node: #BK-{activeBooking.id.toUpperCase()}</p>
                   </div>
                   <div className="w-2 h-2 rounded-full pulse-dot"></div>
                </div>
                <div className="pt-5 border-t border-border flex justify-between items-center relative z-10">
                   <span className="text-[9px] font-black text-white uppercase tracking-widest italic">Signal expires in <span className="text-teal-br">{formatTime(timeLeft)}</span></span>
                   <ChevronRight className="w-4 h-4 text-dim group-hover:text-teal-br transition-colors" />
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-br/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             </motion.div>
           </section>
         )}

         <section className="space-y-4">
            <h3 className="text-[10px] font-display text-white uppercase tracking-[3px]">Operational History</h3>
            <div className="space-y-3">
               {MOCK_HISTORY.map(history => (
                  <div key={history.id} className="bg-surface border border-border p-5 rounded-2xl flex justify-between items-center group transition-all hover:border-teal-dim">
                     <div className="space-y-1.5">
                        <h4 className="text-[11px] font-display text-white">{history.zoneName}</h4>
                        <div className="flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-dim"></div>
                           <p className="text-[8px] text-muted uppercase font-black tracking-widest">{history.date} • {history.time}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        <span className={`text-[8px] font-black uppercase tracking-[2px] italic ${history.status === 'completed' ? 'text-teal-br' : 'text-error opacity-60'}`}>
                           {history.status}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${history.status === 'completed' ? 'bg-teal-br' : 'bg-error'}`}></div>
                     </div>
                  </div>
               ))}
            </div>
         </section>

         <button 
           onClick={() => navigateTo('login')}
           className="w-full flex items-center justify-center p-5 bg-error/5 border border-error/20 rounded-2xl group transition-all hover:bg-error hover:border-error"
         >
            <span className="text-[10px] font-black text-error uppercase tracking-[4px] group-hover:text-white transition-colors">Terminate Authorized Session</span>
         </button>
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-surface border border-border rounded-[24px] px-6 py-3 flex items-center justify-between z-40 shadow-2xl">
        {[
          { s: 'home' as Screen, i: LayoutDashboard },
          { s: 'zones' as Screen, i: MapIcon },
          { s: 'active' as Screen, i: CalendarCheck },
          { s: 'profile' as Screen, i: User }
        ].map(tab => (
          <button 
             key={tab.s}
             onClick={() => navigateTo(tab.s)} 
             className={`p-3 rounded-xl transition-all ${screen === tab.s ? 'bg-teal-br text-bg shadow-lg shadow-teal-br/20 scale-110' : 'text-muted hover:text-white'}`}
          >
            <tab.i className={`w-5 h-5 ${screen === tab.s ? 'stroke-3' : 'stroke-2'}`} />
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-bg relative shadow-2xl overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="min-h-screen"
        >
          {screen === 'login' && renderLogin()}
          {screen === 'home' && renderHome()}
          {screen === 'zones' && renderParkingZones()}
          {screen === 'bays' && renderBayGrid()}
          {screen === 'duration' && renderDurationSelect()}
          {screen === 'confirm' && renderConfirm()}
          {screen === 'active' && renderActive()}
          {screen === 'ai-suggestions' && renderAISuggestions()}
          {screen === 'notifications' && renderNotifications()}
          {screen === 'feedback' && renderFeedback()}
          {screen === 'profile' && renderProfile()}
          {screen === 'overstay-prompt' && renderOverstayPrompt()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
