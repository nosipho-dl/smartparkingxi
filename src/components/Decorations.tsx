import { motion } from 'motion/react';
import { Car } from 'lucide-react';

export const AnimatedCar = ({ className = "" }: { className?: string }) => {
  return (
    <motion.div
      initial={{ y: 0, rotate: 0 }}
      animate={{ 
        y: [-4, 4, -4],
        rotate: [-1, 1, -1]
      }}
      transition={{ 
        duration: 4, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className={`relative flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full scale-150" />
      <div className="relative bg-white p-8 rounded-[40px] shadow-2xl border border-white/50">
        <Car className="w-20 h-20 text-blue-600 stroke-[1.5]" />
      </div>
      
      {/* Small details */}
      <motion.div 
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -bottom-2 w-16 h-2 bg-black/10 blur-md rounded-full"
      />
    </motion.div>
  );
};

export const SmartConnectivityBackground = () => {
  const pings = [
    { top: '15%', left: '10%' },
    { top: '25%', left: '85%' },
    { top: '55%', left: '5%' },
    { top: '75%', left: '90%' },
    { top: '40%', left: '40%' },
    { top: '85%', left: '20%' },
    { top: '10%', left: '70%' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Connections (Static thin lines for performance) */}
      <svg className="absolute inset-0 w-full h-full opacity-10">
        <line x1="15%" y1="15%" x2="40%" y2="40%" stroke="currentColor" strokeWidth="1" />
        <line x1="40%" y1="40%" x2="70%" y2="10%" stroke="currentColor" strokeWidth="1" />
        <line x1="40%" y1="40%" x2="85%" y2="25%" stroke="currentColor" strokeWidth="1" />
        <line x1="5%" y1="55%" x2="40%" y2="40%" stroke="currentColor" strokeWidth="1" />
        <line x1="20%" y1="85%" x2="40%" y2="40%" stroke="currentColor" strokeWidth="1" />
        <line x1="90%" y1="75%" x2="85%" y2="25%" stroke="currentColor" strokeWidth="1" />
      </svg>

      {pings.map((p, i) => (
        <div key={i} className="ping-dot" style={{ top: p.top, left: p.left }}>
          <div className="absolute inset-0 pulse-dot rounded-full scale-[3]" />
        </div>
      ))}
    </div>
  );
};
