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
  Brain,
  LayoutDashboard, 
  Map as MapIcon, 
  MapPin, 
  MessageSquare, 
  Navigation, 
  ParkingCircle,
  Search, 
  Star, 
  User as UserIcon, 
  Zap,
  ArrowRight,
  LogOut,
  Calendar,
  Check,
  ShieldCheck,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ReactNode, useEffect, useState, useMemo } from 'react';
import { getParkingSuggestion, ParkingSuggestion } from './services/geminiService';
import { auth, signInWithGoogle, logout as firebaseLogout, testConnection, syncZones, syncUserBookings, syncUserProfile, updateUserPreference, saveBooking, updateBookingStatus, seedInitialData, requestArrival, approveCheckIn, syncPendingCheckins, syncUserRole } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { AnimatedCar, SmartConnectivityBackground } from './components/Decorations';

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
  | 'overstay-prompt'
  | 'security-dashboard';

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
  userId: string;
  zoneId: string;
  zoneName: string;
  bayId: string;
  bayLabel: string;
  startTime: number;
  expiryTime: number;
  durationHours: number;
  status: 'pending' | 'confirmed' | 'expired' | 'completed' | 'cancelled' | 'PENDING_CHECKIN' | 'APPROVED';
  arrivalTime?: number;
  checkInTime?: number;
  approvedBy?: string;
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
  const base = "px-8 py-4 rounded-[28px] font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3 text-[14px] font-display tracking-tight";
  const variants = {
    primary: "bg-[#2563eb] text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700",
    secondary: "bg-[#e0f2fe] text-[#2563eb] border border-blue-100",
    outline: "border-2 border-[#2563eb] text-[#2563eb] hover:bg-blue-50",
    ghost: "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100",
    danger: "bg-red-500 text-white shadow-xl shadow-red-500/20",
    success: "bg-green-500 text-white shadow-xl shadow-green-500/20",
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
  <header className="px-6 py-6 flex items-center justify-between sticky top-0 bg-white/70 backdrop-blur-md z-30">
    <div className="flex items-center gap-4">
      {showBack && (
        <button onClick={onBack} className="p-3 bg-white soft-shadow rounded-2xl text-slate-800 hover:bg-slate-50">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-xl font-display font-semibold text-slate-900">{title}</h1>
    </div>
    <button onClick={onNotify} className="p-3 bg-white soft-shadow rounded-2xl relative text-slate-600">
      <Bell className="w-5 h-5" />
      <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
    </button>
  </header>
);

const Badge = ({ status }: { status: Zone['status'] }) => {
  const configs = {
    available: { label: 'Available', color: 'bg-green-100 text-green-700' },
    limited: { label: 'Limited', color: 'bg-orange-100 text-orange-700' },
    full: { label: 'Full', color: 'bg-red-100 text-red-700' },
  };
  const config = configs[status];
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-tight ${config.color}`}>
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
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBlockedUntil, setIsBlockedUntil] = useState<number | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ParkingSuggestion | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [userPreference, setUserPreference] = useState("Closest and Cheapest");
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingCheckins, setPendingCheckins] = useState<Booking[]>([]);

  // Authentication & Connection Test
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoggedIn(true);
        if (screen === 'login') navigateTo('home');
        
        // Seed if needed
        seedInitialData(INITIAL_ZONES);
      } else {
        setIsLoggedIn(false);
        setScreen('login');
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const unsubZones = syncZones((data) => {
      setZones(data);
    });

    const unsubProfile = syncUserProfile(user.uid, (data) => {
      if (data.type === 'private' && data.userPreference) {
        setUserPreference(data.userPreference);
      }
    });

    const unsubBookings = syncUserBookings(user.uid, (data) => {
      setAllBookings(data as Booking[]);
      // Find the most recent active booking if any
      const active = data.find(b => b.status === 'pending' || b.status === 'confirmed' || b.status === 'PENDING_CHECKIN' || b.status === 'APPROVED');
      if (active) {
         setActiveBooking(active as Booking);
      } else {
         setActiveBooking(null);
      }
    });

    const unsubRole = syncUserRole(user.uid, (role) => {
      setUserRole(role);
    });

    return () => {
      unsubZones();
      unsubProfile();
      unsubBookings();
      unsubRole();
    };
  }, [isLoggedIn, user]);

  // Security Sync
  useEffect(() => {
    if (userRole !== 'security' && userRole !== 'admin' && user?.email !== 'nosi.notes@gmail.com') return;
    const unsub = syncPendingCheckins((data) => {
      setPendingCheckins(data as Booking[]);
    });
    return () => unsub();
  }, [userRole, user]);

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

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseLogout();
      setScreen('login');
      setHistory(['login']);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const fetchAiSuggestion = async () => {
    if (!selectedZone) return;
    
    setIsAiLoading(true);
    setAiSuggestion(null);
    
    const availableBays = selectedZone.bays
      .filter(b => b.status === 'available')
      .map(b => ({
        id: b.id,
        type: rowToType(b.label.charAt(0)),
        price: rowToPrice(b.label.charAt(0)),
        distance: "Close" // Mocked for now
      }));

    if (availableBays.length === 0) {
      setIsAiLoading(false);
      return;
    }

    const suggestion = await getParkingSuggestion(selectedZone.name, availableBays, userPreference);
    setAiSuggestion(suggestion);
    setIsAiLoading(false);
    
    // Auto-select if a specific bay is recommended and found
    if (suggestion) {
      const targetBay = selectedZone.bays.find(b => b.label === suggestion.bayId || b.id === suggestion.bayId);
      if (targetBay) {
        setSelectedBay(targetBay);
      }
    }
  };

  const rowToType = (row: string) => {
    if (row === 'A') return "Premium";
    if (row === 'B') return "Standard";
    return "Economy";
  };

  const rowToPrice = (row: string) => {
    if (row === 'A') return 15.00;
    if (row === 'B') return 10.00;
    return 7.50;
  };

  const handleReserve = (zone: Zone) => {
    setAiSuggestion(null);
    setSelectedBay(null);
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

  const confirmReservation = async () => {
    if (!selectedZone || !selectedBay || !selectedDurationHours || !user) return;
    
    const booking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.uid,
      zoneId: selectedZone.id,
      zoneName: selectedZone.name,
      bayId: selectedBay.id,
      bayLabel: selectedBay.label,
      startTime: Date.now(),
      expiryTime: Date.now() + (15 * 60 * 1000), // 15 mins to check in
      durationHours: selectedDurationHours,
      status: 'pending'
    };

    try {
      await saveBooking(booking);
      setActiveBooking(booking);
      navigateTo('confirm');
    } catch (error) {
      console.error("Booking failed", error);
    }
  };

  const cancelBooking = async () => {
    if (activeBooking) {
      try {
        await updateBookingStatus(activeBooking.id, activeBooking.zoneId, activeBooking.bayId, 'cancelled', 'available');
        setActiveBooking(null);
        navigateTo('home');
      } catch (error) {
        console.error("Cancel failed", error);
      }
    }
  };

  const handleArrival = async () => {
    if (activeBooking) {
      try {
        await requestArrival(activeBooking.id);
        // Local state update will happen via sync
      } catch (error) {
        console.error("Arrival request failed", error);
      }
    }
  };

  const handleApprove = async (booking: Booking) => {
    if (user) {
      try {
        await approveCheckIn(booking, user.uid);
      } catch (error) {
        console.error("Approval failed", error);
      }
    }
  };

  const checkIn = async () => {
    if (activeBooking) {
      // Once checked in, expiry time is set based on selected duration
      const expiry = Date.now() + (activeBooking.durationHours * 60 * 60 * 1000);
      try {
        // Update booking status and bay status
        await updateBookingStatus(activeBooking.id, activeBooking.zoneId, activeBooking.bayId, 'confirmed', 'occupied');
        navigateTo('active');
      } catch (error) {
        console.error("Check-in failed", error);
      }
    }
  };

  const checkOut = async () => {
    if (activeBooking) {
        try {
          await updateBookingStatus(activeBooking.id, activeBooking.zoneId, activeBooking.bayId, 'completed', 'available');
          
          // Penalty check: if expired and overstayed
          if (timeLeft === 0 && activeBooking.status === 'confirmed') {
              const blockedUntil = Date.now() + (24 * 60 * 60 * 1000); // 1 day penalty
              setIsBlockedUntil(blockedUntil);
          }
          
          setActiveBooking(null);
          navigateTo('home');
        } catch (error) {
          console.error("Check-out failed", error);
        }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- Render Screens ---

  const renderLogin = () => (
    <div className="min-h-screen flex flex-col justify-between p-10 relative overflow-hidden main-gradient">
      <SmartConnectivityBackground />
      
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-12">
        <div className="space-y-4 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-20 h-20 bg-white/40 backdrop-blur-xl rounded-[24px] mx-auto flex items-center justify-center soft-shadow"
          >
            <ParkingCircle className="w-10 h-10 text-[#2563eb]" />
          </motion.div>
          <div className="space-y-1">
            <h1 className="text-4xl font-display font-bold tracking-tight text-slate-900">Find Parking Smarter</h1>
            <p className="text-slate-500 font-medium tracking-widest uppercase text-[10px] font-black italic mt-2">Group 19 Campus Finder</p>
          </div>
        </div>

        <AnimatedCar />

        <div className="w-full space-y-4">
          <Button 
            className="w-full py-5 rounded-[32px] text-lg" 
            onClick={signInWithGoogle}
          >
            <Zap className="w-5 h-5 fill-current" />
            Sign in with Google
          </Button>
          <p className="text-center text-[10px] uppercase font-black tracking-widest text-[#2563eb]/60">Student & Staff Entrance</p>
        </div>
      </div>

      <div className="relative z-10 text-center py-4">
        <p className="text-[10px] text-slate-400 font-medium">© 2026 DUT Parking Systems</p>
      </div>
    </div>
  );

  const renderHome = () => {
    const availableTotal = zones.reduce((acc, z) => acc + (z.capacity - z.used), 0);
    const isPenaltyActive = isBlockedUntil && isBlockedUntil > Date.now();

    return (
      <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
        <SmartConnectivityBackground />
        <Header title="" onNotify={() => navigateTo('notifications')} />
        
        <main className="px-6 py-4 space-y-10 relative z-10">
          <header className="space-y-1">
            <h2 className="text-3xl font-display font-bold text-slate-900">Hey, {user?.displayName?.split(' ')[0] || 'User'} 👋</h2>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot"></div>
               <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Live Parking Intelligence</p>
            </div>
          </header>

          {isPenaltyActive && (
            <motion.section 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-6 bg-red-50 border border-red-100 rounded-[32px] flex items-center gap-5 soft-shadow"
            >
              <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center shrink-0">
                 <Info className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                 <h4 className="font-display font-bold text-red-900 text-sm">Penalty Active</h4>
                 <p className="text-xs text-red-600 font-medium">Please wait 24h to book again.</p>
              </div>
            </motion.section>
          )}

          {activeBooking ? (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card bg-[#2563eb] border-none text-white overflow-hidden relative shadow-2xl shadow-blue-500/30"
            >
               <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[3px] text-blue-100/60">Active Booking</span>
                        <h3 className="text-2xl font-display font-bold">{activeBooking.bayLabel} • {activeBooking.zoneName}</h3>
                     </div>
                     <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                        <Clock className="w-5 h-5" />
                     </div>
                  </div>
                  
                  <div className="flex items-end justify-between">
                     <div className="space-y-1">
                        <p className="text-[10px] font-bold text-blue-100/60 uppercase tracking-widest">Expires In</p>
                        <p className="text-3xl font-display font-medium">{formatTime(timeLeft)}</p>
                     </div>
                     <Button 
                        variant="secondary" 
                        className="bg-white text-[#2563eb] border-none !px-6 !py-3 !rounded-2xl"
                        onClick={() => navigateTo('active')}
                     >
                        View Ticket
                     </Button>
                  </div>
               </div>
               <Car className="absolute -bottom-10 -right-10 w-48 h-48 text-white/5 rotate-12" />
            </motion.section>
          ) : (
            <motion.section 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               onClick={() => !isPenaltyActive && navigateTo('zones')}
               className={`premium-card bg-white cursor-pointer group transition-all hover:scale-[1.02] ${isPenaltyActive ? 'opacity-50 grayscale pointer-events-none' : ''}`}
            >
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-blue-50 rounded-[32px] flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                     <ParkingCircle className="w-10 h-10 text-[#2563eb]" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <div className="flex items-center justify-between">
                        <h3 className="text-xl font-display font-bold text-slate-900">Find Parking</h3>
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#2563eb] transition-all transform group-hover:translate-x-1" />
                     </div>
                     <p className="text-sm text-slate-500 font-medium">Discover open spots in seconds</p>
                  </div>
               </div>
            </motion.section>
          )}

          <section className="space-y-6">
             <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-display font-bold text-slate-900">Quick Stats</h3>
                <div className="flex-1 h-px bg-slate-200 ml-4 max-w-[40px]"></div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="premium-card p-5 bg-emerald-50/50 space-y-4">
                   <div className="p-2 w-fit rounded-xl bg-white soft-shadow">
                      <Zap className="w-4 h-4 text-emerald-500" />
                   </div>
                   <div>
                      <p className="text-2xl font-display font-bold text-slate-900 leading-none">{availableTotal}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Free Slots</p>
                   </div>
                </div>
                <div className="premium-card p-5 bg-purple-50/50 space-y-4">
                   <div className="p-2 w-fit rounded-xl bg-white soft-shadow">
                      <Star className="w-4 h-4 text-purple-500" />
                   </div>
                   <div>
                      <p className="text-2xl font-display font-bold text-slate-900 leading-none">4</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Campus Zones</p>
                   </div>
                </div>
             </div>
          </section>

          {/* AI Insight */}
          <motion.div 
             whileHover={{ y: -5 }}
             className="bg-[#2563eb] p-7 rounded-[32px] text-white flex items-center gap-6 relative overflow-hidden soft-shadow"
          >
             <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md relative z-10 shrink-0">
                <Brain className="w-8 h-8 text-blue-100" />
             </div>
             <div className="space-y-1 relative z-10">
                <span className="text-[9px] font-black uppercase tracking-[3px] text-blue-100/60">AI Smart Feed</span>
                <p className="text-sm font-medium leading-relaxed">
                  {zones.find(z => z.status === 'full') 
                    ? `${zones.find(z => z.status === 'full')?.name} is busy. We recommend ${zones.find(z => z.status === 'available')?.name || 'North Parking'}.`
                    : "The campus is quiet today. Park at the Entrance for the shortest walk!"}
                </p>
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          </motion.div>
        </main>

        <nav className="fixed bottom-6 left-6 right-6 bg-white/80 backdrop-blur-lg border border-white/20 rounded-[32px] px-8 py-4 flex items-center justify-between z-40 shadow-2xl">
          {[
            { s: 'home' as Screen, i: LayoutDashboard },
            { s: 'zones' as Screen, i: MapIcon },
            { s: 'active' as Screen, i: CalendarCheck },
            { s: 'profile' as Screen, i: UserIcon }
          ].map(tab => (
            <button 
               key={tab.s}
               onClick={() => navigateTo(tab.s)} 
               className={`p-3 rounded-2xl transition-all ${screen === tab.s ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-slate-400 hover:text-slate-900'}`}
            >
              <tab.i className={`w-6 h-6 ${screen === tab.s ? 'stroke-[2.5]' : 'stroke-2'}`} />
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderParkingZones = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="Station Finder" showBack onBack={goBack} onNotify={() => navigateTo('notifications')} />
      
      <main className="px-6 py-4 space-y-8 relative z-10">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search zones..." 
            className="w-full bg-white soft-shadow rounded-3xl pl-14 pr-6 py-5 text-sm font-medium outline-none border border-transparent focus:border-blue-500/20 transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-4 pb-2 overflow-x-auto scrollbar-hide px-1">
          {['All', 'Riverside', 'Indumiso', 'Steve Biko', 'Ritson', 'ML Sultan'].map(tag => (
            <button 
              key={tag} 
              className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap
                ${tag === 'All' ? 'bg-[#2563eb] text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-500 hover:bg-slate-50'}
              `}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {zones.map(zone => (
            <motion.div 
              layoutId={zone.id}
              key={zone.id} 
              whileTap={{ scale: 0.98 }}
              className="premium-card group cursor-pointer active:bg-slate-50 transition-all"
              onClick={() => handleReserve(zone)}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#2563eb]">
                    <ParkingCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-display font-bold text-slate-900 group-hover:text-[#2563eb] transition-colors">{zone.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <MapPin className="w-3.5 h-3.5 text-blue-400" />
                       {zone.campus} Campus
                    </div>
                  </div>
                </div>
                <Badge status={zone.status} />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex-1 max-w-[180px] space-y-3">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Occupancy</span>
                      <span>{Math.round((zone.used / zone.capacity) * 100)}%</span>
                   </div>
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                     <motion.div 
                        initial={false}
                        animate={{ width: `${(zone.used / zone.capacity) * 100}%` }}
                        className={`h-full rounded-full ${zone.status === 'full' ? 'bg-red-500' : 'bg-[#2563eb]'}`}
                     />
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-lg font-display font-bold text-slate-900">{zone.distance}</p>
                   <p className="text-[10px] font-black uppercase tracking-widest text-[#2563eb]">Away</p>
                </div>
              </div>
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
      <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
        <SmartConnectivityBackground />
        <Header title="Choose Spot" showBack onBack={goBack} />
        
        <main className="px-6 py-4 flex flex-col gap-10 relative z-10">
          {/* Legend Section */}
          <section className="bg-white/50 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] grid grid-cols-2 gap-y-5 gap-x-8 soft-shadow">
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Free</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center">
                   <Car className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Taken</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border-2 border-dashed border-indigo-500/30"></div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Booked</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#2563eb] shadow-lg shadow-blue-500/30 flex items-center justify-center">
                   <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-black text-[#2563eb] uppercase tracking-widest">Selected</span>
             </div>
          </section>

          {/* AI Suggestion Section */}
          <section className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot"></div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Smart Selection</h3>
                </div>
                {!isAiLoading && !aiSuggestion && (
                   <button 
                      onClick={fetchAiSuggestion}
                      className="text-[10px] font-black text-[#2563eb] uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-2"
                   >
                      <Brain className="w-4 h-4" />
                      Generate Suggestion
                   </button>
                )}
             </div>

             {!aiSuggestion && !isAiLoading && (
               <div className="flex gap-3 px-2 overflow-x-auto pb-2 scrollbar-hide px-1">
                 {['Closest and Cheapest', 'Safest / Well Lit', 'Next to Entrance', 'Best Value'].map(pref => (
                   <button 
                     key={pref}
                     onClick={() => {
                       setUserPreference(pref);
                       if (user) updateUserPreference(user.uid, pref);
                     }}
                     className={`whitespace-nowrap px-6 py-3 rounded-2xl text-[10px] font-bold transition-all border
                       ${userPreference === pref ? 'bg-[#2563eb] border-transparent text-white shadow-lg shadow-blue-500/20' : 'bg-white border-white text-slate-400 hover:text-[#2563eb] hover:bg-white'}
                     `}
                   >
                     {pref}
                   </button>
                 ))}
               </div>
             )}

             <AnimatePresence mode="wait">
                {isAiLoading ? (
                   <motion.div 
                      key="loading"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/50 backdrop-blur-xl border-2 border-dashed border-blue-500/20 p-8 rounded-[32px] flex flex-col items-center justify-center gap-4 soft-shadow"
                   >
                      <div className="w-12 h-12 rounded-full border-4 border-[#2563eb] border-t-transparent animate-spin"></div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Running Neural Optimization...</p>
                   </motion.div>
                ) : aiSuggestion ? (
                   <motion.div 
                      key="suggestion"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#2563eb] text-white p-8 rounded-[40px] shadow-2xl shadow-blue-500/30 relative overflow-hidden group"
                   >
                      <div className="relative z-10 flex justify-between items-start">
                         <div className="space-y-3">
                            <div className="flex items-center gap-2">
                               <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                                  <Brain className="w-5 h-5 text-blue-100" />
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-widest text-blue-100/60">AI Recommendation</span>
                            </div>
                            <h4 className="text-3xl font-display font-bold leading-none">Bay {aiSuggestion.bayId}</h4>
                            <p className="text-xs font-medium leading-relaxed max-w-[220px] text-blue-100/80">{aiSuggestion.reason}</p>
                         </div>
                         <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col items-center shadow-xl">
                            <span className="text-2xl font-display font-bold leading-none">{aiSuggestion.convenienceScore}%</span>
                            <span className="text-[8px] font-black uppercase tracking-widest mt-1 text-blue-100/40">Efficiency</span>
                         </div>
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                         <span className="text-[10px] font-black uppercase tracking-widest text-blue-100/60 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            ~{aiSuggestion.estimatedWalkingTime} Walk
                         </span>
                         <button 
                            onClick={fetchAiSuggestion}
                            className="bg-white/10 p-2.5 rounded-2xl hover:bg-white/20 transition-colors"
                         >
                            <Zap className="w-4 h-4" />
                         </button>
                      </div>

                      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                   </motion.div>
                ) : null}
             </AnimatePresence>
          </section>

          {/* Map/Grid Section */}
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-[48px] p-8 space-y-12 overflow-y-auto max-h-[600px] scrollbar-hide shadow-inner">
            {rows.map((rowName, idx) => (
              <div key={rowName} className="relative">
                {idx > 0 && (
                   <div className="absolute inset-x-0 -top-6 h-[2px] bg-slate-100 rounded-full"></div>
                )}
                
                <div className="flex items-start gap-6">
                   {/* Row Label */}
                   <div className="w-14 flex flex-col items-center justify-center py-5 bg-white border border-slate-100 rounded-2xl shrink-0 soft-shadow">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Row</span>
                      <span className="text-2xl font-display font-bold text-[#2563eb]">{rowName}</span>
                   </div>

                   {/* Bay Items */}
                   <div className="flex-1 grid grid-cols-5 gap-4">
                    {baysByRow[rowName].map(bay => (
                      <motion.button
                        key={bay.id}
                        whileTap={{ scale: 0.9 }}
                        whileHover={{ scale: 1.05 }}
                        animate={selectedBay?.id === bay.id ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
                        onClick={() => selectBay(bay)}
                        className={`relative w-full aspect-[3/5] rounded-[20px] flex flex-col items-center justify-between p-2 pb-2 transition-all overflow-hidden border-2
                          ${bay.status === 'occupied' ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' : 
                            bay.status === 'reserved' ? 'bg-indigo-50/30 border-indigo-100' : 
                            selectedBay?.id === bay.id ? 'bg-[#2563eb] border-[#2563eb] shadow-xl shadow-blue-500/20' : 
                            'bg-white border-white hover:border-blue-100 shadow-sm'}
                        `}
                      >
                        <span className={`text-[9px] font-black tracking-widest ${selectedBay?.id === bay.id ? 'text-white/60' : 'text-slate-300'}`}>
                           {bay.label}
                        </span>

                        <div className="flex-1 flex items-center justify-center w-full">
                           {bay.status === 'occupied' ? (
                              <Car className="w-10 h-10 text-slate-200" />
                           ) : bay.status === 'reserved' ? (
                              <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                           ) : selectedBay?.id === bay.id ? (
                              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                 <Check className="w-6 h-6 text-white" />
                              </div>
                           ) : (
                              <div className="w-[1.5px] h-[60%] bg-slate-100 rounded-full"></div>
                           )}
                        </div>

                        <div className={`w-full h-1.5 rounded-full ${bay.status === 'occupied' ? 'bg-red-300' : bay.status === 'reserved' ? 'bg-indigo-300' : selectedBay?.id === bay.id ? 'bg-white' : 'bg-emerald-400'}`}></div>
                      </motion.button>
                    ))}
                   </div>
                </div>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {selectedBay && (
              <motion.div 
                 initial={{ opacity: 0, y: 50 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 50 }}
                 className="fixed bottom-24 left-6 right-6 z-50"
              >
                 <Button 
                   onClick={proceedToDuration}
                   className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-blue-500/40 relative overflow-hidden"
                 >
                    <div className="flex items-center justify-center gap-3">
                       <span>Reserve Bay {selectedBay.label}</span>
                       <ArrowRight className="w-6 h-6" />
                    </div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                 </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  };

  const renderDurationSelect = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="Stay Duration" showBack onBack={goBack} />
      <main className="px-6 py-8 space-y-12 relative z-10">
        <div className="space-y-2">
            <h3 className="text-3xl font-display font-bold text-slate-900">Select Duration</h3>
            <p className="text-slate-500 font-medium">How long will you be staying with us?</p>
        </div>

        <div className="grid grid-cols-1 gap-5">
           {[
              { h: 1, label: 'Standard', range: '1.0 Hour', desc: 'Ideal for quick errands or visits', color: 'emerald' },
              { h: 4, label: 'Lecture', range: '4.0 Hours', desc: 'Perfect for classes & meetings', color: 'blue' },
              { h: 8, label: 'Long Stay', range: '8.0 Hours', desc: 'Valid for full campus day', color: 'indigo' }
           ].map(opt => (
              <button 
                key={opt.h}
                onClick={() => setSelectedDurationHours(opt.h)}
                className={`premium-card p-6 border-2 text-left transition-all relative overflow-hidden group
                  ${selectedDurationHours === opt.h ? `border-${opt.color}-500 bg-white` : 'bg-white border-white hover:border-slate-100'}
                `}
              >
                <div className="flex justify-between items-center relative z-10">
                   <div className="space-y-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${selectedDurationHours === opt.h ? `text-${opt.color}-500` : 'text-slate-400'}`}>
                         {opt.label}
                      </span>
                      <h4 className="font-display font-bold text-2xl text-slate-900">{opt.range}</h4>
                      <p className="text-xs text-slate-500 font-medium">{opt.desc}</p>
                   </div>
                   <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center border transition-all ${selectedDurationHours === opt.h ? `bg-${opt.color}-50 border-${opt.color}-100` : 'bg-slate-50 border-slate-100'}`}>
                      <Clock className={`w-8 h-8 ${selectedDurationHours === opt.h ? `text-${opt.color}-500` : 'text-slate-400'}`} />
                   </div>
                </div>
                {selectedDurationHours === opt.h && (
                   <div className={`absolute top-0 right-0 w-24 h-24 bg-${opt.color}-500/5 rounded-full -mr-12 -mt-12 blur-2xl`}></div>
                )}
              </button>
           ))}
        </div>

        <div className="pt-8">
           <Button 
                className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-blue-500/40" 
                disabled={!selectedDurationHours}
                onClick={confirmReservation}
           >
              Confirm Reservation
           </Button>
        </div>
      </main>
    </div>
  );

  const renderConfirm = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 main-gradient text-center space-y-12 relative overflow-hidden">
      <SmartConnectivityBackground />
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-32 h-32 bg-[#2563eb]/10 border border-[#2563eb]/30 rounded-[40px] flex items-center justify-center relative shadow-2xl relative z-10"
      >
        <CheckCircle className="w-16 h-16 text-[#2563eb]" />
        <div className="absolute inset-0 rounded-[40px] border-4 border-[#2563eb] animate-ping opacity-10"></div>
      </motion.div>

      <div className="space-y-4 relative z-10">
        <h2 className="text-4xl font-display font-bold text-slate-900">Success!</h2>
        <p className="text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
           Your spot at <span className="text-[#2563eb] font-bold">{selectedZone?.name}</span> is ready. Just follow the navigation to <span className="text-[#2563eb] font-bold">Bay {selectedBay?.label}</span>.
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-10 rounded-[48px] w-full space-y-8 soft-shadow relative z-10">
         <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-[4px] text-slate-400 px-2">
            <span>Pass Code</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 pulse-dot"></div>
         </div>
         <div className="bg-blue-50 border border-blue-100 rounded-[32px] py-10 flex flex-col items-center gap-2">
            <span className="text-5xl font-display font-bold text-[#2563eb] tracking-[12px] ml-[12px]">X9-J42</span>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">15 MIN Arrival Window</span>
         </div>
      </div>

      <Button onClick={() => navigateTo('home')} className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-blue-500/40 relative z-10">
        Back To Hub
      </Button>
    </div>
  );

  const renderActive = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="My Station" showBack onBack={goBack} />
      
      <main className="px-6 py-4 space-y-8 relative z-10">
        {!activeBooking ? (
          <div className="py-24 text-center space-y-8 bg-white/40 backdrop-blur-xl rounded-[48px] border border-white/20 soft-shadow">
            <div className="w-28 h-28 bg-blue-50 border border-blue-100 rounded-[40px] mx-auto flex items-center justify-center text-[#2563eb]">
              <CalendarCheck className="w-14 h-14" />
            </div>
            <div className="space-y-2">
               <h3 className="text-2xl font-display font-bold text-slate-900">No Active Booking</h3>
               <p className="text-slate-400 font-medium">Ready for your next journey?</p>
            </div>
            <Button onClick={() => navigateTo('zones')} className="px-10 py-5 rounded-3xl">Find Parking</Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-[56px] border border-white/40 text-center relative overflow-hidden shadow-2xl">
               <div className="bg-[#2563eb] p-10 text-white space-y-4 relative overflow-hidden">
                   <div className="relative z-10">
                      <span className="text-[10px] uppercase font-black tracking-[0.6em] text-blue-100/50">Digital Entry Ticket</span>
                      <h2 className="text-4xl font-display font-bold leading-tight mt-2">{activeBooking.zoneName}</h2>
                      <div className="flex items-center justify-center gap-3 mt-6">
                         <div className="px-5 py-2 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/10">
                            <span className="text-xs font-bold tracking-widest">Bay {activeBooking.bayLabel}</span>
                         </div>
                         <div className="px-5 py-2 bg-white/10 rounded-2xl backdrop-blur-lg border border-white/10">
                            <span className="text-xs font-bold tracking-widest">Floor 0{Math.floor(Math.random() * 3) + 1}</span>
                         </div>
                      </div>
                   </div>
                   <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                   <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
               </div>

               <div className="p-10 space-y-12 bg-white">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 font-black">Started</p>
                        <p className="text-2xl font-display font-bold text-slate-900">{new Date(activeBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-left">
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-2">Expiry</p>
                        <p className="text-2xl font-display font-bold text-red-500">{new Date(activeBooking.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                  </div>

                  {activeBooking.status === 'pending' ? (
                    <div className="space-y-10">
                        <div className="w-48 h-48 relative mx-auto flex flex-col items-center justify-center">
                           <svg className="w-full h-full transform -rotate-90">
                              <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                              <motion.circle 
                                 cx="96" cy="96" r="88" 
                                 stroke="currentColor" strokeWidth="6" fill="transparent" 
                                 strokeDasharray="553" 
                                 strokeDashoffset={553 - (553 * (timeLeft / (15 * 60)))} 
                                 strokeLinecap="round" 
                                 className="text-[#2563eb] transition-all duration-1000" 
                              />
                           </svg>
                           <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-4xl font-display font-bold text-slate-900">{formatTime(timeLeft)}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[3px] mt-2">Arrival Lock</span>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <Button className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-blue-500/30" onClick={handleArrival}>
                              Capture Check-in
                           </Button>
                           <button onClick={cancelBooking} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">Cancel Reservation</button>
                        </div>
                    </div>
                  ) : activeBooking.status === 'PENDING_CHECKIN' ? (
                    <div className="space-y-10">
                        <div className="w-48 h-48 relative mx-auto flex flex-col items-center justify-center">
                           <div className="w-full h-full rounded-full border-4 border-dashed border-blue-500/20 animate-[spin_12s_linear_infinite] flex items-center justify-center">
                              <ShieldCheck className="w-20 h-20 text-blue-500/20" />
                           </div>
                           <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full">
                              <motion.div 
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-16 h-16 bg-[#2563eb] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/40"
                              >
                                 <Zap className="w-8 h-8" />
                              </motion.div>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <h4 className="text-xl font-display font-bold text-slate-900">Awaiting Validation</h4>
                           <p className="text-sm text-slate-400 font-medium px-4">Ground crew is currently verifying your bay allocation. Sit tight, pilot.</p>
                        </div>
                        <button onClick={cancelBooking} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">Cancel Request</button>
                    </div>
                  ) : (
                    <div className="space-y-12">
                       <div className="bg-slate-50 p-10 rounded-[40px] flex items-center justify-center relative inner-shadow group overflow-hidden">
                          <div className="relative z-10 grid grid-cols-6 gap-3">
                             {[...Array(36)].map((_, i) => (
                               <motion.div 
                                 key={i} 
                                 animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1, 0.9] }}
                                 transition={{ delay: i * 0.05, repeat: Infinity, duration: 3 }}
                                 className={`w-3.5 h-3.5 rounded-sm ${Math.random() > 0.4 ? 'bg-[#2563eb] shadow-lg shadow-blue-500/30' : 'bg-slate-200'}`}
                               ></motion.div>
                             ))}
                          </div>
                          <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       </div>
                       
                       <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2 mb-4">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot"></div>
                           <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[6px]">Secure Session {activeBooking.status === 'APPROVED' ? 'Granted' : 'Live'}</p>
                        </div>
                        {activeBooking.status === 'APPROVED' && (
                          <Button className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-emerald-500/30 bg-emerald-500 hover:bg-emerald-600 border-none" onClick={checkIn}>
                            Finalize Occupancy
                          </Button>
                        )}
                        <Button className="w-full py-6 rounded-[32px] text-xl bg-slate-100 text-slate-400 border-none shadow-none hover:bg-red-50 hover:text-red-500 transition-all" onClick={checkOut}>
                            Release Station
                        </Button>
                       </div>
                    </div>
                  )}
               </div>

               {/* Design Decoration */}
               <div className="absolute left-0 top-[220px] -translate-x-6 w-12 h-12 bg-slate-50 border border-slate-100 rounded-full soft-shadow"></div>
               <div className="absolute right-0 top-[220px] translate-x-6 w-12 h-12 bg-slate-50 border border-slate-100 rounded-full soft-shadow"></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  const renderSecurityDashboard = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="Mission Control" onNotify={() => navigateTo('notifications')} />
      <main className="px-6 py-4 space-y-8 relative z-10">
        <div className="space-y-2">
          <h3 className="text-3xl font-display font-bold text-slate-900">Validations</h3>
          <p className="text-[10px] font-black uppercase tracking-[4px] text-[#2563eb]">Authorize entry requests</p>
        </div>

        <div className="space-y-6">
          {pendingCheckins.length === 0 ? (
            <div className="py-24 text-center space-y-6 bg-white/40 backdrop-blur-xl rounded-[48px] border border-white/20 soft-shadow">
              <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-3xl mx-auto flex items-center justify-center text-blue-300">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clear queue. No requests.</p>
            </div>
          ) : (
            pendingCheckins.map(booking => (
              <motion.div 
                key={booking.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="premium-card p-8 group relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-[#2563eb] uppercase tracking-[4px]">Pass: {booking.id.slice(0, 6).toUpperCase()}</span>
                    <h4 className="text-2xl font-display font-bold text-slate-900">{booking.bayLabel} • {booking.zoneName}</h4>
                  </div>
                  <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex flex-col items-center">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Gate arrival</span>
                    <span className="text-xs font-bold text-[#2563eb]">{new Date(booking.arrivalTime || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-8 p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subject Reference</p>
                  <p className="text-xs text-slate-600 font-medium font-mono">{booking.userId}</p>
                </div>

                <div className="flex gap-4">
                  <Button className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 border-none" onClick={() => handleApprove(booking)}>
                    Authorize
                  </Button>
                  <Button variant="ghost" className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 border-none hover:bg-red-50 hover:text-red-500" onClick={() => updateBookingStatus(booking.id, booking.zoneId, booking.bayId, 'pending', 'reserved')}>
                    Decline
                  </Button>
                </div>
                
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      <nav className="fixed bottom-8 left-8 right-8 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[32px] px-8 py-4 flex items-center justify-between z-40 soft-shadow">
        <button onClick={() => navigateTo('home')} className="p-3 rounded-2xl text-slate-400 hover:text-[#2563eb] hover:bg-blue-50 transition-all">
          <LayoutDashboard className="w-6 h-6" />
        </button>
        <button className="bg-[#2563eb] text-white p-4 rounded-2xl shadow-xl shadow-blue-500/30 scale-110">
          <Zap className="w-6 h-6" />
        </button>
        <button onClick={() => navigateTo('profile')} className="p-3 rounded-2xl text-slate-400 hover:text-[#2563eb] hover:bg-blue-50 transition-all">
          <UserIcon className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );

  const renderOverstayPrompt = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-10 main-gradient text-center space-y-12 relative overflow-hidden">
      <SmartConnectivityBackground />
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4 }}
        className="w-32 h-32 bg-red-50 border border-red-100 rounded-[40px] flex items-center justify-center text-red-500 shadow-2xl relative z-10"
      >
        <Clock className="w-16 h-16" />
      </motion.div>

      <div className="space-y-4 relative z-10">
        <h2 className="text-4xl font-display font-bold text-slate-900">Session Over</h2>
        <p className="text-slate-500 font-medium max-w-[260px] mx-auto leading-relaxed">
           Your reservation at <span className="text-red-500 font-bold">Bay {activeBooking?.bayLabel}</span> has expired. Please vacate or extend.
        </p>
      </div>

      <div className="w-full space-y-4 relative z-10">
        <Button onClick={() => setScreen('duration')} className="w-full py-6 rounded-[32px] text-xl shadow-lg shadow-blue-500/20">Extend Duration</Button>
        <button onClick={checkOut} className="w-full py-6 rounded-[32px] text-lg font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">End Session</button>
      </div>
    </div>
  );

  const renderAISuggestions = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="AI Intelligence" showBack onBack={goBack} />
      <main className="px-6 py-4 space-y-8 relative z-10">
        <div className="bg-white/40 backdrop-blur-2xl border border-white/20 p-10 rounded-[48px] shadow-2xl relative overflow-hidden group">
           <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              <div className="w-24 h-24 bg-blue-500 rounded-[32px] flex items-center justify-center shadow-xl shadow-blue-500/40 relative">
                 <div className="absolute inset-0 bg-white/20 animate-pulse rounded-[32px]"></div>
                 <Sparkles className="w-12 h-12 text-white" />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-display font-bold text-slate-900 italic">Smart Navigator</h3>
                 <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
                    "I've analyzed real-time traffic. {selectedZone?.name} is reaching peak capacity. I suggest redirecting for 100% availability."
                 </p>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        </div>

        <div className="space-y-4">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Optimized Slots</h4>
           <div className="space-y-4">
              {zones.filter(z => z.status === 'available').slice(0, 3).map((zone, idx) => (
                 <div key={zone.id} className="premium-card p-6 flex justify-between items-center group cursor-pointer hover:border-[#2563eb]/30 transition-all">
                    <div className="space-y-1">
                       <h5 className="font-display font-bold text-slate-900">{zone.name}</h5>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">3 MIN Navigation • HIGH PROBABILITY</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#2563eb] group-hover:bg-[#2563eb] group-hover:text-white transition-all">
                       <Navigation className="w-6 h-6" />
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </main>
    </div>
  );

  const renderNotifications = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="Alert Center" showBack onBack={goBack} />
      <main className="px-6 py-4 space-y-8 relative z-10">
        <div className="space-y-6">
           {MOCK_ALERTS.map((alert, i) => (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="premium-card p-6 flex items-start gap-6 group hover:scale-[1.02] transition-all"
              >
                 <div className={`w-14 h-14 rounded-2xl mt-1 flex items-center justify-center shrink-0 ${
                    alert.type === 'error' ? 'bg-red-50 text-red-500' : 
                    alert.type === 'warning' ? 'bg-amber-50 text-amber-500' : 'bg-blue-50 text-blue-500'
                 }`}>
                    {alert.type === 'error' ? <AlertTriangle className="w-8 h-8" /> : 
                     alert.type === 'warning' ? <AlertTriangle className="w-8 h-8" /> : <Bell className="w-8 h-8" />}
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between items-center">
                       <h4 className="font-display font-bold text-slate-900">{alert.title}</h4>
                       <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{alert.time}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{alert.message}</p>
                 </div>
              </motion.div>
           ))}
        </div>
      </main>
    </div>
  );

  const renderFeedback = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="Ground Intel" showBack onBack={goBack} />
      <main className="px-6 py-4 space-y-10 relative z-10">
        <div className="p-10 bg-white/40 backdrop-blur-xl rounded-[48px] border border-white/20 soft-shadow space-y-8">
           <div className="space-y-2 text-center">
              <h3 className="text-2xl font-display font-bold text-slate-900">Experience Report</h3>
              <p className="text-xs font-medium text-slate-400">Help us optimize the campus network</p>
           </div>
           
           <div className="space-y-6">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Subject Category</label>
                 <div className="grid grid-cols-2 gap-4">
                    {['Sensor Fault', 'Navigation', 'Billing', 'Safety'].map(cat => (
                       <button key={cat} className="py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 hover:border-[#2563eb] hover:bg-blue-50 hover:text-[#2563eb] transition-all uppercase tracking-widest">{cat}</button>
                    ))}
                 </div>
              </div>
              
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Detailed Log</label>
                 <textarea 
                    className="w-full h-40 bg-slate-50 border border-slate-100 rounded-[32px] p-6 text-sm font-medium focus:outline-none focus:border-[#2563eb] transition-all placeholder:text-slate-300" 
                    placeholder="Describe the anomaly..."
                 />
              </div>

              <Button className="w-full py-6 rounded-[32px] text-xl shadow-2xl shadow-blue-500/30" onClick={() => {
                alert('Intelligence received. Thank you, traveler.');
                navigateTo('home');
              }}>Transmit Intel</Button>
           </div>
        </div>
      </main>
    </div>
  );

  const renderProfile = () => (
    <div className="min-h-screen pb-24 main-gradient relative overflow-hidden">
      <SmartConnectivityBackground />
      <Header title="My Persona" onNotify={() => navigateTo('notifications')} />
      
      <main className="px-6 py-4 space-y-12 relative z-10">
         <section className="text-center space-y-6 pb-6 relative">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-white rounded-full mx-auto flex items-center justify-center relative soft-shadow border-4 border-white overflow-hidden">
                 {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                    <span className="text-5xl font-display font-bold text-[#2563eb]">
                      {user?.displayName ? user.displayName.split(' ').map(n => n[0]).join('') : 'U'}
                    </span>
                 )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#2563eb] rounded-2xl border-4 border-white flex items-center justify-center shadow-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
               <h2 className="text-3xl font-display font-bold text-slate-900">{user?.displayName || 'Traveler'}</h2>
               <div className="flex items-center justify-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                 <p className="text-[10px] font-black uppercase tracking-[4px] text-slate-400">{user?.email || 'ID: ST-2024'}</p>
               </div>
            </div>
         </section>

         {activeBooking && (
           <section className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Session Active</h3>
             <motion.div 
               whileTap={{ scale: 0.98 }}
               className="bg-[#2563eb] text-white p-8 rounded-[40px] shadow-2xl shadow-blue-500/30 cursor-pointer relative overflow-hidden group" 
               onClick={() => navigateTo('active')}
             >
                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div className="space-y-1">
                      <h4 className="font-display font-bold text-2xl">{activeBooking.zoneName}</h4>
                      <p className="text-[10px] text-blue-100/60 font-black uppercase tracking-widest italic">REF: #{activeBooking.id.toUpperCase()}</p>
                   </div>
                   <div className="w-3 h-3 rounded-full bg-white pulse-dot"></div>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-between items-center relative z-10">
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-100/80">Expires in <span className="text-white font-bold">{formatTime(timeLeft)}</span></span>
                   <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                   </div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
             </motion.div>
           </section>
         )}

         <section className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Security Hub</h3>
            <div className="space-y-4">
              <Button 
                 className="w-full py-5 rounded-[28px] bg-slate-900 text-white border-none hover:bg-slate-800" 
                 onClick={() => navigateTo('security-dashboard')}
              >
                 <div className="flex items-center justify-center gap-3">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Access Portal</span>
                 </div>
              </Button>
              {(user?.email === 'nosi.notes@gmail.com') && (
                 <button 
                    className="w-full py-4 rounded-[24px] border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#2563eb] hover:border-[#2563eb] transition-all"
                    onClick={async () => {
                      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
                      const { db } = await import('./lib/firebase');
                      await setDoc(doc(db, 'roles', user.uid), {
                        role: userRole === 'security' ? 'user' : 'security',
                        updatedAt: serverTimestamp()
                      });
                    }}
                 >
                    Cycle Authorization Level ({userRole || 'standard'})
                 </button>
              )}
            </div>
         </section>

         <section className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px] pl-2">Session Archive</h3>
            <div className="space-y-4">
               {allBookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length === 0 && (
                 <div className="py-12 bg-white/40 rounded-[32px] border border-white/20 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Archive Empty</p>
                 </div>
               )}
               {allBookings.filter(b => b.status === 'completed' || b.status === 'cancelled').sort((a,b) => b.startTime - a.startTime).map(booking => (
                  <div key={booking.id} className="bg-white/60 backdrop-blur-xl border border-white/40 p-6 rounded-[32px] flex justify-between items-center group hover:bg-white transition-all soft-shadow">
                     <div className="space-y-2">
                        <h4 className="text-sm font-display font-bold text-slate-900">{booking.zoneName}</h4>
                        <div className="flex items-center gap-2">
                           <Calendar className="w-3 h-3 text-slate-300" />
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                             {new Date(booking.startTime).toLocaleDateString()}
                           </p>
                        </div>
                     </div>
                     <div className="flex items-center gap-4">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${booking.status === 'completed' ? 'text-emerald-500' : 'text-red-400'}`}>
                           {booking.status}
                        </span>
                        <div className={`w-2 h-2 rounded-full ${booking.status === 'completed' ? 'bg-emerald-500' : 'bg-red-400'}`}></div>
                     </div>
                  </div>
               ))}
            </div>
         </section>

         <button 
           onClick={handleLogout}
           className="w-full flex items-center justify-center py-6 bg-red-50 rounded-[32px] group hover:bg-red-500 transition-all border border-red-100"
         >
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[6px] group-hover:text-white transition-colors">Terminate Identity</span>
         </button>
      </main>

      <nav className="fixed bottom-8 left-8 right-8 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-[32px] px-8 py-4 flex items-center justify-between z-40 soft-shadow">
        {[
          { s: 'home' as Screen, i: LayoutDashboard },
          { s: 'zones' as Screen, i: MapIcon },
          { s: 'active' as Screen, i: CalendarCheck },
          { s: 'profile' as Screen, i: UserIcon }
        ].map(tab => (
          <button 
             key={tab.s}
             onClick={() => navigateTo(tab.s)} 
             className={`p-3 rounded-2xl transition-all ${screen === tab.s ? 'bg-[#2563eb] text-white shadow-xl shadow-blue-500/30 scale-110' : 'text-slate-400 hover:text-[#2563eb] hover:bg-blue-50'}`}
          >
            <tab.i className={`w-6 h-6 ${screen === tab.s ? 'stroke-3' : 'stroke-2'}`} />
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8fafc] relative shadow-2xl overflow-x-hidden font-sans">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
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
          {screen === 'security-dashboard' && renderSecurityDashboard()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
