import { 
  Bell, 
  BookHeart, 
  CalendarCheck, 
  Car,
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
  const base = "px-6 py-3 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 text-xs uppercase tracking-wide";
  const variants = {
    primary: "bg-royal-blue text-white shadow-lg shadow-royal-blue/10",
    secondary: "bg-dut-purple text-white shadow-lg shadow-dut-purple/10",
    outline: "border border-royal-blue text-royal-blue bg-white",
    ghost: "bg-baby-blue text-royal-blue",
    danger: "bg-error text-white shadow-lg shadow-error/10",
    success: "bg-success text-white shadow-lg shadow-success/10",
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
  <header className="px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-30">
    <div className="flex items-center gap-3">
      {showBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-royal-blue hover:bg-slate-100 rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <h1 className="text-base font-extrabold uppercase tracking-tight text-royal-blue">{title}</h1>
    </div>
    <button onClick={onNotify} className="p-2 bg-white soft-shadow rounded-full relative">
      <Bell className="w-5 h-5 text-gray" />
      <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
    </button>
  </header>
);

const Badge = ({ status }: { status: Zone['status'] }) => {
  const configs = {
    available: { label: 'Open', color: 'bg-success text-white' },
    limited: { label: 'Limited', color: 'bg-warning text-dark' },
    full: { label: 'Full', color: 'bg-error text-white' },
  };
  const config = configs[status];
  return (
    <span className={`px-2 py-1 rounded-full text-[9px] uppercase font-bold ${config.color}`}>
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
    <div className="min-h-screen bg-transparent flex flex-col justify-center px-8 py-12 text-dark">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 text-center"
      >
        <div className="w-[60px] h-[60px] bg-royal-blue rounded-[15px] mx-auto mb-[15px] flex items-center justify-center shadow-xl">
          <BookHeart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-[18px] font-extrabold text-royal-blue tracking-tight">Welcome</h2>
        <p className="text-[12px] text-gray mt-1">Sign in to your campus account</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 max-w-xs mx-auto w-full"
      >
        <div className="space-y-3">
          <input 
            type="email" 
            placeholder="Student Email" 
            className="w-full bg-slate-100 rounded-lg px-4 py-3 text-sm focus:bg-white border-transparent focus:border-royal-blue/30 border transition-all outline-hidden"
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full bg-slate-100 rounded-lg px-4 py-3 text-sm focus:bg-white border-transparent focus:border-royal-blue/30 border transition-all outline-hidden"
          />
        </div>
        
        <Button onClick={handleLogin} className="w-full mt-4 !rounded-lg py-4">
          Login
        </Button>
        
        <p className="text-center text-[11px] font-bold text-royal-blue pt-4 cursor-pointer">
          Create Account
        </p>
      </motion.div>
    </div>
  );

  const renderHome = () => {
    const availableTotal = zones.reduce((acc, z) => acc + (z.capacity - z.used), 0);
    const isPenaltyActive = isBlockedUntil && isBlockedUntil > Date.now();

    return (
      <div className="pb-24">
        <Header title="ScratchXI Smart Parking" onNotify={() => navigateTo('notifications')} />
        
        <main className="px-6 py-4 space-y-8">
          <section>
            <p className="text-[11px] font-bold text-gray uppercase tracking-widest">Hi, Alex Henderson</p>
          </section>

          {isPenaltyActive && (
            <motion.section 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3"
            >
              <Info className="w-6 h-6 text-error" />
              <div className="flex-1">
                 <h4 className="font-bold text-error text-xs uppercase">Booking Restricted</h4>
                 <p className="text-[10px] text-error/80">You are blocked until tomorrow for a previous overstay.</p>
              </div>
            </motion.section>
          )}

          <section className="themed-card !border-royal-blue">
            <p className="text-[11px] font-bold text-gray uppercase mb-3 text-center">Live Campus Status</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dut-purple-light p-3 rounded-xl text-center">
                <span className="block text-[10px] text-dut-purple uppercase font-bold mb-1">Available Spots</span>
                <strong className="text-2xl text-dut-purple">{availableTotal}</strong>
              </div>
              <div className="bg-dut-purple-light p-3 rounded-xl text-center">
                <span className="block text-[10px] text-dut-purple uppercase font-bold mb-1">Active Booking</span>
                <strong className="text-2xl text-dut-purple">{activeBooking ? '1' : '0'}</strong>
              </div>
            </div>
          </section>

          {activeBooking && (
            <section className="space-y-3">
              <h3 className="font-bold text-sm text-dark">Current Appointment</h3>
              <motion.div 
                whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo('active')}
                className="themed-card !border-success !bg-baby-blue flex flex-col gap-2 cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs">{activeBooking.zoneName} - Bay {activeBooking.bayLabel}</h3>
                  <Badge status={activeBooking.status === 'pending' ? 'limited' : 'available'} />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-dark/70">
                    {activeBooking.status === 'pending' ? `Arrive in ${formatTime(timeLeft)}` : `Duration: ${activeBooking.durationHours}h • Ends ${new Date(activeBooking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray" />
                </div>
              </motion.div>
            </section>
          )}

          <Button 
            variant="primary" 
            className="w-full !rounded-xl py-4 shadow-xl" 
            onClick={() => navigateTo('zones')}
            disabled={!!isPenaltyActive}
          >
            Start New Booking
          </Button>

          <section className="space-y-4">
            <h3 className="font-bold text-lg">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => navigateTo('feedback')} className="p-4 bg-white soft-shadow rounded-2xl flex flex-col items-center gap-2">
                  <MessageSquare className="w-6 h-6 text-dut-purple" />
                  <span className="text-[10px] font-bold uppercase">Feedback</span>
               </button>
               <button onClick={() => navigateTo('notifications')} className="p-4 bg-white soft-shadow rounded-2xl flex flex-col items-center gap-2">
                  <Bell className="w-6 h-6 text-royal-blue" />
                  <span className="text-[10px] font-bold uppercase">Alerts</span>
               </button>
            </div>
          </section>
        </main>
  
        <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white soft-shadow rounded-3xl px-6 py-4 flex items-center justify-between z-40">
          <button onClick={() => navigateTo('home')} className={`p-2 rounded-xl transition-colors ${screen === 'home' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
            <LayoutDashboard className="w-6 h-6" />
          </button>
          <button onClick={() => navigateTo('zones')} className={`p-2 rounded-xl transition-colors ${screen === 'zones' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
            <MapIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => navigateTo('zones')}
            className={`p-4 bg-royal-blue rounded-2xl -mt-12 shadow-xl shadow-royal-blue/30 text-white ${isPenaltyActive ? 'opacity-50 grayscale' : ''}`}
            disabled={!!isPenaltyActive}
          >
            <Navigation className="w-7 h-7" />
          </button>
          <button onClick={() => navigateTo('active')} className={`p-2 rounded-xl transition-colors ${screen === 'active' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
            <CalendarCheck className="w-6 h-6" />
          </button>
          <button onClick={() => navigateTo('profile')} className={`p-2 rounded-xl transition-colors ${screen === 'profile' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
            <User className="w-6 h-6" />
          </button>
        </nav>
      </div>
    );
  };

  const renderParkingZones = () => (
    <div className="pb-24">
      <Header title="Parking Zones" showBack onBack={goBack} onNotify={() => navigateTo('notifications')} />
      
      <div className="px-6 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search zones or campus..." 
            className="w-full bg-white soft-shadow rounded-2xl pl-12 pr-4 py-4 outline-hidden focus:ring-2 focus:ring-royal-blue/20 transition-all"
          />
        </div>

        <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
          {['All', 'Riverside', 'Indumiso', 'Steve Biko', 'Ritson', 'ML Sultan'].map(tag => (
            <button key={tag} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${tag === 'All' ? 'bg-royal-blue text-white' : 'bg-white soft-shadow text-slate-500'}`}>
              {tag}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {zones.map(zone => (
            <motion.div 
              layoutId={zone.id}
              key={zone.id} 
              className="bg-white p-3 border-b border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors"
              onClick={() => handleReserve(zone)}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs">{zone.name}</h4>
                  <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full font-bold uppercase">{zone.campus}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={false}
                      animate={{ width: `${(zone.used / zone.capacity) * 100}%` }}
                      className={`h-full ${zone.status === 'full' ? 'bg-error' : zone.status === 'limited' ? 'bg-warning' : 'bg-success'}`}
                    />
                  </div>
                  <p className="text-[10px] text-gray uppercase font-medium">
                    {zone.status === 'full' ? 'Zone is full' : `${zone.capacity - zone.used} spaces`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge status={zone.status} />
                <span className="text-[8px] font-bold text-gray uppercase">{zone.type}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
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
      <div className="min-h-screen pb-24 bg-slate-50">
        <Header title="Select Parking Bay" showBack onBack={goBack} />
        
        <main className="px-6 py-4 flex flex-col gap-6">
          {/* Legend Section */}
          <div className="bg-white p-4 rounded-3xl soft-shadow border border-slate-100 grid grid-cols-2 gap-y-3 gap-x-6">
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-success/10 flex items-center justify-center border border-success/20">
                   <div className="w-3 h-3 bg-success rounded-sm"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Available</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-error/10 flex items-center justify-center border border-error/20">
                   <div className="w-5 h-5 text-error">
                      <Car className="w-full h-full" />
                   </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Occupied</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-dut-purple/10 flex items-center justify-center border border-dut-purple/20">
                   <div className="w-3 h-3 bg-dut-purple rounded-sm"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reserved</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-royal-blue/10 flex items-center justify-center border border-royal-blue/20">
                   <div className="w-4 h-4 text-royal-blue">
                      <ParkingCircle className="w-full h-full" />
                   </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selected</span>
             </div>
          </div>

          {/* Map/Grid Section */}
          <div className="bg-white soft-shadow rounded-[40px] border border-slate-100 p-6 space-y-8 overflow-y-auto max-h-[500px] scrollbar-hide shadow-inner bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:20px_20px]">
            {rows.map((rowName, idx) => (
              <div key={rowName} className="relative">
                {/* Visual "Lane" Indicator after rows (except last) */}
                {idx > 0 && (
                   <div className="h-10 mb-8 flex items-center justify-center border-y border-dashed border-slate-200">
                      <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.5em]">Driving Lane</span>
                   </div>
                )}
                
                <div className="flex items-start gap-4">
                  {/* Row Label */}
                  <div className="w-8 flex flex-col items-center justify-center pt-2">
                     <span className="text-[10px] font-black text-slate-300 uppercase">Row</span>
                     <span className="text-2xl font-black text-royal-blue">{rowName}</span>
                  </div>

                  {/* Bay Items */}
                  <div className="flex-1 grid grid-cols-5 gap-3">
                    {baysByRow[rowName].map(bay => (
                      <motion.button
                        key={bay.id}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        animate={selectedBay?.id === bay.id ? { y: -4, scale: 1.05 } : { y: 0, scale: 1 }}
                        onClick={() => selectBay(bay)}
                        className={`relative w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-between p-2 pb-1 border-2 transition-all overflow-hidden
                          ${bay.status === 'occupied' ? 'bg-slate-50 border-slate-100 grayscale opacity-80' : 
                            bay.status === 'reserved' ? 'bg-dut-purple/5 border-dut-purple/20' : 
                            selectedBay?.id === bay.id ? 'bg-royal-blue border-royal-blue shadow-lg shadow-royal-blue/20' : 
                            'bg-white border-success/20 hover:border-success/40'}
                        `}
                      >
                        {/* Bay ID Label */}
                        <span className={`text-[9px] font-black ${selectedBay?.id === bay.id ? 'text-white/60' : 'text-slate-300'}`}>
                           {bay.label}
                        </span>

                        {/* Centered Icon */}
                        <div className="flex-1 flex items-center justify-center w-full">
                           {bay.status === 'occupied' ? (
                              <Car className="w-8 h-8 text-error/40" />
                           ) : bay.status === 'reserved' ? (
                              <div className="w-2.5 h-2.5 bg-dut-purple rounded-full animate-pulse"></div>
                           ) : selectedBay?.id === bay.id ? (
                              <ParkingCircle className="w-8 h-8 text-white" />
                           ) : (
                              <div className="w-1.5 h-full border-x border-slate-50"></div>
                           )}
                        </div>

                        {/* Bottom Status Dot */}
                        <div className={`w-full h-1 rounded-full ${bay.status === 'occupied' ? 'bg-error' : bay.status === 'reserved' ? 'bg-dut-purple' : selectedBay?.id === bay.id ? 'bg-white' : 'bg-success'}`}></div>

                        {/* Background subtle gradient for visual depth */}
                        {selectedBay?.id === bay.id && (
                           <div className="absolute inset-0 bg-linear-to-tr from-royal-blue to-royal-blue/80 pointer-events-none -z-10"></div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm/Select Drawer (Floats when selection made) */}
          <AnimatePresence>
            {selectedBay && (
                <motion.div 
                   initial={{ y: 50, opacity: 0 }}
                   animate={{ y: 0, opacity: 1 }}
                   exit={{ y: 50, opacity: 0 }}
                   className="themed-card !border-royal-blue flex items-center justify-between p-6 m-0 z-50 sticky bottom-4 shadow-2xl"
                >
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-royal-blue/10 rounded-md flex items-center justify-center">
                            <ParkingCircle className="w-3.5 h-3.5 text-royal-blue" />
                         </div>
                         <h4 className="font-black text-royal-blue text-lg">Bay {selectedBay.label}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Confirmed Available</p>
                   </div>
                   <Button variant="primary" className="!rounded-2xl px-8 py-4 text-sm font-bold shadow-lg shadow-royal-blue/30" onClick={proceedToDuration}>
                      Reserve Now
                   </Button>
                </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  const renderDurationSelect = () => (
    <div className="min-h-screen pb-24">
      <Header title="Set Duration" showBack onBack={goBack} />
      <main className="px-6 py-4 space-y-8">
        <div className="text-center space-y-2">
            <h3 className="text-2xl font-extrabold text-royal-blue">How long will you stay?</h3>
            <p className="text-gray text-sm italic">Accurate timing helps campus management.</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
           {[
              { h: 1, label: 'Short Stay', range: '1 Hour', color: 'bg-baby-blue' },
              { h: 4, label: 'Medium Stay', range: '2 - 4 Hours', color: 'bg-dut-purple-light' },
              { h: 8, label: 'Long Stay', range: '5 - 8 Hours', color: 'bg-slate-100' }
           ].map(opt => (
              <button 
                key={opt.h}
                onClick={() => setSelectedDurationHours(opt.h)}
                className={`p-6 rounded-3xl border-2 text-left transition-all relative overflow-hidden
                  ${selectedDurationHours === opt.h ? 'border-royal-blue ring-4 ring-royal-blue/10 scale-[1.02]' : 'border-transparent bg-white soft-shadow'}
                `}
              >
                <div className="flex justify-between items-center relative z-10">
                   <div>
                      <h4 className="font-bold text-dark">{opt.label}</h4>
                      <p className="font-extrabold text-royal-blue text-xl">{opt.range}</p>
                   </div>
                   <Clock className={`w-10 h-10 ${selectedDurationHours === opt.h ? 'text-royal-blue' : 'text-slate-200'}`} />
                </div>
              </button>
           ))}
        </div>

        <div className="fixed bottom-32 left-6 right-6">
           <Button 
                variant="primary" 
                className="w-full !rounded-2xl py-5 shadow-2xl" 
                disabled={!selectedDurationHours}
                onClick={confirmReservation}
           >
              Confirm Reservation Details
           </Button>
        </div>
      </main>
    </div>
  );

  const renderConfirm = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mb-8"
      >
        <CalendarCheck className="w-12 h-12" />
      </motion.div>
      <h2 className="text-3xl font-bold font-display text-royal-blue mb-2 text-center">Parking Reserved!</h2>

      <p className="text-slate-500 mb-8 max-w-xs mx-auto">
        Your spot at <span className="font-bold text-royal-blue">{selectedZone?.name}</span> is held for you.
      </p>

      <div className="bg-white soft-shadow rounded-3xl p-8 w-full space-y-6 border border-slate-100 max-w-sm">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Arrive Within</p>
          <div className="text-5xl font-bold text-royal-blue font-display">
            {formatTime(timeLeft)}
          </div>
        </div>
        
        <div className="pt-6 border-t border-slate-50 space-y-3">
          <Button variant="primary" className="w-full" onClick={() => navigateTo('active')}>
            Manage Booking
          </Button>
          <Button variant="ghost" className="w-full" onClick={cancelBooking}>
            Cancel Reservation
          </Button>
        </div>
      </div>
    </div>
  );

  const renderActive = () => (
    <div className="pb-24">
      <Header title="Smart Ticket" showBack onBack={goBack} />
      
      <main className="px-6 py-4 space-y-6">
        {!activeBooking ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-slate-300">
              <CalendarCheck className="w-10 h-10" />
            </div>
            <p className="text-slate-400 font-medium">No active bookings found.</p>
            <Button variant="outline" onClick={() => navigateTo('zones')}>Book a Spot</Button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-[40px] soft-shadow border border-slate-100 text-center relative overflow-hidden">
               <div className="bg-royal-blue p-6 text-white space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-60">Digital Parking Ticket</h4>
                   <h2 className="text-2xl font-bold">{activeBooking.zoneName}</h2>
                   <p className="text-sm opacity-80">Bay {activeBooking.bayLabel} • {activeBooking.durationHours}h Session</p>
               </div>

               <div className="p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-4 text-left">
                     <div>
                        <p className="text-[9px] font-bold text-gray uppercase mb-1">Start Time</p>
                        <p className="font-extrabold text-royal-blue">{new Date(activeBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-gray uppercase mb-1">Expiry Time</p>
                        <p className="font-extrabold text-error">{new Date(activeBooking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>

                  {activeBooking.status === 'pending' ? (
                    <div className="space-y-4">
                        <div className="w-32 h-32 border-8 border-warning/20 border-t-warning rounded-full mx-auto flex flex-col items-center justify-center">
                           <span className="text-2xl font-extrabold text-warning">{formatTime(timeLeft)}</span>
                           <span className="text-[8px] font-bold text-gray uppercase">To Check-in</span>
                        </div>
                        <Button variant="primary" className="w-full !rounded-xl py-4" onClick={checkIn}>
                           Check-In on Arrival
                        </Button>
                        <Button variant="ghost" className="w-full text-gray" onClick={cancelBooking}>
                           Cancel Reservation
                        </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       <div className="w-40 h-40 bg-slate-50 border-2 border-slate-100 rounded-3xl mx-auto flex items-center justify-center p-4">
                          {/* Mock QR */}
                          <div className="grid grid-cols-5 gap-1">
                             {[...Array(25)].map((_, i) => (
                               <div key={i} className={`w-6 h-6 rounded-xs ${Math.random() > 0.4 ? 'bg-dark' : 'bg-transparent'}`}></div>
                             ))}
                          </div>
                       </div>
                       <div className="space-y-2">
                        <p className="text-xs font-bold text-success uppercase flex items-center justify-center gap-1">
                           <Zap className="w-4 h-4 fill-current" /> Valid Parking Session
                        </p>
                        <Button variant="outline" className="w-full !rounded-xl py-4 border-error text-error hover:bg-error hover:text-white" onClick={checkOut}>
                            Release Bay (Check-Out)
                        </Button>
                       </div>
                    </div>
                  )}
               </div>

               {/* Decoration perforation */}
               <div className="absolute left-0 top-[200px] -translate-x-4 w-8 h-8 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
               <div className="absolute right-0 top-[200px] translate-x-4 w-8 h-8 bg-slate-50 rounded-full border border-slate-100 shadow-inner"></div>
            </div>
          </>
        )}
      </main>
    </div>
  );

  const renderOverstayPrompt = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-royal-blue text-white text-center">
       <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-white animate-pulse" />
       </div>
       <h2 className="text-2xl font-bold mb-2">Session Ended</h2>
       <p className="opacity-80 mb-8">You have reached the 8-hour maximum limit. Are you still parked at the campus?</p>
       
       <div className="w-full space-y-4">
          <Button variant="primary" className="w-full bg-white text-royal-blue py-4" onClick={() => navigateTo('home')}>
             Extend Session
          </Button>
          <Button variant="outline" className="w-full border-white text-white py-4" onClick={checkOut}>
             Check Out Now
          </Button>
       </div>
    </div>
  );

  const renderAISuggestions = () => (
    <div className="pb-24">
      <Header title="Smart Help" showBack onBack={goBack} />
      
      <main className="px-6 py-4 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-baby-blue/20 rounded-full mx-auto flex items-center justify-center">
            <Zap className="w-10 h-10 text-royal-blue" />
          </div>
          <h2 className="text-2xl font-bold font-display text-royal-blue">Zone is Full!</h2>
          <p className="text-slate-500">I've analyzed campus data to find the best alternative for you.</p>
        </div>

        <div className="space-y-6">
          <h3 className="font-bold flex items-center gap-2">
            Top Alternatives
          </h3>
          
          <div className="space-y-4">
            {zones.filter(z => z.status === 'available').slice(0, 2).map((zone, idx) => (
              <div key={zone.id} className="bg-white soft-shadow border border-slate-100 rounded-3xl p-6 relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="bg-royal-blue text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">
                         {idx + 1}
                       </span>
                       <h4 className="font-bold text-lg">{zone.name}</h4>
                    </div>
                    <p className="text-sm text-slate-500">{zone.campus} • Typically less busy.</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-royal-blue pt-2">
                       <Navigation className="w-3 h-3" />
                       {zone.distance} away
                    </div>
                  </div>
                  <Button variant="outline" className="px-4 py-2" onClick={() => handleReserve(zone)}>
                    Choose
                  </Button>
                </div>
                {idx === 0 && (
                  <div className="absolute top-0 right-0 py-1 px-4 bg-royal-blue text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">
                    Recommended
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

          <div className="ai-box-gradient p-5 rounded-xl text-white relative overflow-hidden">
            <h4 className="font-bold text-sm mb-1">Smart Suggestion</h4>
            <p className="text-[11px] opacity-90 leading-tight">
              {selectedZone?.name} is full. Try <strong>Sports Centre</strong> (92% match). It usually has space until 10:30 AM.
            </p>
            <Button 
                variant="ghost" 
                className="w-full mt-3 bg-white/20 border-white/30 text-white hover:bg-white/30 !rounded-lg"
                onClick={() => handleReserve(zones[0])}
            >
              Route to Suggestion
            </Button>
          </div>
      </main>
    </div>
  );

  const renderNotifications = () => (
    <div className="min-h-screen pb-24">
      <Header title="Notifications" showBack onBack={goBack} />
      <div className="px-6 py-4 space-y-4">
        {MOCK_ALERTS.map((alert) => (
          <div 
            key={alert.id} 
            className={`p-4 rounded-2xl border bg-white flex gap-4 transition-all hover:soft-shadow ${alert.type === 'error' ? 'border-error/20' : alert.type === 'warning' ? 'border-warning/20' : 'border-success/20'}`}
          >
            <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${alert.type === 'error' ? 'bg-error' : alert.type === 'warning' ? 'bg-warning' : 'bg-success'}`}></div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-royal-blue">{alert.title}</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{alert.time}</span>
              </div>
              <p className="text-sm text-slate-500 leading-snug">{alert.message}</p>
            </div>
          </div>
        ))}
        
        {MOCK_ALERTS.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            No new notifications.
          </div>
        )}
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="min-h-screen pb-24">
      <Header title="Zone Feedback" showBack onBack={goBack} />
      <main className="px-6 py-4 space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-display text-royal-blue">Report Status</h2>
          <p className="text-slate-500">Notice something different on the ground? Let us know to keep the data fresh for everyone.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
             <label className="text-xs font-bold uppercase text-slate-400">Select Zone</label>
             <select className="w-full bg-white soft-shadow rounded-2xl px-4 py-4 outline-hidden appearance-none border-none">
                <option>Select a zone...</option>
                {zones.map(z => <option key={z.id}>{z.name}</option>)}
             </select>
          </div>

          <div className="space-y-3">
             <label className="text-xs font-bold uppercase text-slate-400">Current Observation</label>
             <div className="grid grid-cols-2 gap-3">
                <button className="p-4 rounded-2xl border bg-white text-center hover:bg-success/5 hover:border-success/30 transition-all flex flex-col items-center gap-2">
                   <div className="w-3 h-3 bg-success rounded-full"></div>
                   <span className="font-bold text-sm">Zone is Empty</span>
                </button>
                <button className="p-4 rounded-2xl border bg-white text-center hover:bg-error/5 hover:border-error/30 transition-all flex flex-col items-center gap-2">
                   <div className="w-3 h-3 bg-error rounded-full"></div>
                   <span className="font-bold text-sm">Zone is Full</span>
                </button>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-xs font-bold uppercase text-slate-400">Additional Comments</label>
             <textarea 
               placeholder="e.g. Maintenance in progress, few spots near the back..." 
               className="w-full bg-white soft-shadow rounded-2xl px-4 py-4 min-h-[120px] outline-hidden"
             ></textarea>
          </div>

          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={() => {
              alert("Thank you for your feedback!");
              navigateTo('home');
            }}
          >
            Submit Feedback
          </Button>
        </div>
      </main>
    </div>
  );

  const renderProfile = () => (
    <div className="pb-24">
      <Header title="User Profile" showBack onBack={goBack} onNotify={() => navigateTo('notifications')} />
      
      <main className="px-6 py-4 space-y-8">
         <section className="text-center space-y-4 py-4">
            <div className="w-24 h-24 bg-royal-blue rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-xl">
               AH
            </div>
            <div>
               <h2 className="text-2xl font-extrabold text-royal-blue tracking-tight">Alex Henderson</h2>
               <p className="text-gray text-xs font-bold uppercase tracking-wider">alex.henderson@dut4life.ac.za</p>
            </div>
         </section>

         {activeBooking && (
           <section className="space-y-3">
             <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray">Active Reservation</h3>
             <motion.div 
               whileTap={{ scale: 0.98 }}
               className="themed-card !border-success bg-baby-blue/30 cursor-pointer" 
               onClick={() => navigateTo('active')}
             >
                <div className="flex justify-between items-center mb-1">
                   <h4 className="font-bold text-sm text-royal-blue">{activeBooking.zoneName}</h4>
                   <Badge status="available" />
                </div>
                <p className="text-[10px] font-bold text-gray uppercase">Conf No: #BK-{activeBooking.id.toUpperCase()}</p>
                <div className="mt-3 pt-3 border-t border-white flex justify-between items-center">
                   <span className="text-[10px] font-bold text-success uppercase">Expires in {formatTime(timeLeft)}</span>
                   <ChevronRight className="w-4 h-4 text-gray" />
                </div>
             </motion.div>
           </section>
         )}

         <section className="space-y-4">
            <h3 className="font-bold text-[10px] uppercase tracking-[0.2em] text-gray">Booking History</h3>
            <div className="space-y-3">
               {MOCK_HISTORY.map(history => (
                  <div key={history.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-50 flex justify-between items-center group active:bg-slate-50 transition-colors">
                     <div className="space-y-1">
                        <h4 className="font-bold text-xs text-dark">{history.zoneName}</h4>
                        <p className="text-[9px] text-gray uppercase font-bold tracking-tight">{history.date} • {history.time}</p>
                     </div>
                     <span className={`text-[9px] font-bold uppercase tracking-widest ${history.status === 'completed' ? 'text-success' : 'text-error'}`}>
                        {history.status}
                     </span>
                  </div>
               ))}
            </div>
         </section>

         <Button variant="outline" className="w-full text-error border-error/20 hover:bg-error/5 !rounded-xl" onClick={() => navigateTo('login')}>
            Log Out Account
         </Button>
      </main>

      {/* Nav Bar */}
      <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-xl border border-white soft-shadow rounded-3xl px-6 py-4 flex items-center justify-between z-40">
        <button onClick={() => navigateTo('home')} className={`p-2 rounded-xl transition-colors ${screen === 'home' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button onClick={() => navigateTo('zones')} className={`p-2 rounded-xl transition-colors ${screen === 'zones' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
          <MapIcon className="w-6 h-6" />
        </button>
        <button onClick={() => navigateTo('zones')} className="p-4 bg-royal-blue rounded-2xl -mt-12 shadow-xl shadow-royal-blue/30 text-white">
          <Navigation className="w-7 h-7" />
        </button>
        <button onClick={() => navigateTo('active')} className={`p-2 rounded-xl transition-colors ${screen === 'active' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
          <CalendarCheck className="w-6 h-6" />
        </button>
        <button onClick={() => navigateTo('profile')} className={`p-2 rounded-xl transition-colors ${screen === 'profile' ? 'text-royal-blue bg-royal-blue/10' : 'text-slate-400 hover:text-royal-blue'}`}>
          <User className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 relative shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
