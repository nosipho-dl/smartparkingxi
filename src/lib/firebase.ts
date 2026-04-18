import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  query, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  where,
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  };
}

export const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: user?.uid || 'anonymous',
        email: user?.email || '',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || !user,
        providerInfo: user?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      console.log("Sign-in popup closed by user or cancelled.");
      return null; // Return null instead of throwing to avoid breaking the UI flow
    }
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const ensureUserProfile = async (user: User) => {
  const publicRef = doc(db, `users/${user.uid}/public/profile`);
  const privateRef = doc(db, `users/${user.uid}/private/info`);

  try {
    const publicSnap = await getDocFromServer(publicRef);
    if (!publicSnap.exists()) {
      await setDoc(publicRef, {
        displayName: user.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
    }

    const privateSnap = await getDocFromServer(privateRef);
    if (!privateSnap.exists()) {
      await setDoc(privateRef, {
        email: user.email,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, 'write', `users/${user.uid}`);
  }
};

// CRITICAL: Connection test as per instructions
export async function testConnection() {
  try {
    // Attempting to read a dummy doc to verify connection and config
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    } else {
      // It's okay if its missing or insufficient permissions, as long as it's not a config error
      console.log("Firebase connection test performed.");
    }
  }
}

// Data Helpers
export const syncZones = (callback: (zones: any[]) => void) => {
  const q = query(collection(db, 'zones'));
  return onSnapshot(q, async (snapshot) => {
    try {
      const zonesData: any[] = [];
      for (const zoneDoc of snapshot.docs) {
        const zone = { id: zoneDoc.id, ...zoneDoc.data() };
        // Fetch bays as subcollection
        const baysSnapshot = await getDocs(collection(db, `zones/${zoneDoc.id}/bays`));
        const bays = baysSnapshot.docs.map(b => ({ id: b.id, ...b.data() }));
        zonesData.push({ ...zone, bays });
      }
      callback(zonesData);
    } catch (error) {
      handleFirestoreError(error, 'list', 'zones');
    }
  }, (error) => {
     handleFirestoreError(error, 'list', 'zones');
  });
};

export const syncUserBookings = (userId: string, callback: (bookings: any[]) => void) => {
  const q = query(collection(db, 'bookings'), where('userId', '==', userId));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(bookings);
  }, (error) => {
    handleFirestoreError(error, 'list', 'bookings');
  });
};

export const syncUserProfile = (userId: string, callback: (data: any) => void) => {
  // Public profile
  const unsubPublic = onSnapshot(doc(db, `users/${userId}/public/profile`), (d) => {
    if (d.exists()) callback({ type: 'public', ...d.data() });
  });
  // Private info
  const unsubPrivate = onSnapshot(doc(db, `users/${userId}/private/info`), (d) => {
    if (d.exists()) callback({ type: 'private', ...d.data() });
  });
  return () => {
    unsubPublic();
    unsubPrivate();
  };
};

export const saveBooking = async (booking: any) => {
  const { id, ...data } = booking;
  try {
    const batch = writeBatch(db);
    
    // 1. Create booking
    const bookingRef = doc(db, 'bookings', id);
    batch.set(bookingRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Mark bay as reserved
    const bayRef = doc(db, `zones/${data.zoneId}/bays/${data.bayId}`);
    batch.update(bayRef, {
      status: 'reserved',
      updatedAt: serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'write', 'bookings');
  }
};

export const updateBookingStatus = async (bookingId: string, zoneId: string, bayId: string, status: string, bayStatus: string) => {
  const batch = writeBatch(db);
  
  const bookingRef = doc(db, 'bookings', bookingId);
  batch.update(bookingRef, {
    status,
    updatedAt: serverTimestamp()
  });

  const bayRef = doc(db, `zones/${zoneId}/bays/${bayId}`);
  batch.update(bayRef, {
    status: bayStatus,
    updatedAt: serverTimestamp()
  });

  await batch.commit();
};

export const updateUserPreference = async (userId: string, preference: string) => {
  const ref = doc(db, `users/${userId}/private/info`);
  await updateDoc(ref, {
    userPreference: preference,
    updatedAt: serverTimestamp()
  });
};

export const requestArrival = async (bookingId: string) => {
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, {
    status: 'PENDING_CHECKIN',
    arrivalTime: Date.now(),
    updatedAt: serverTimestamp()
  });
};

export const approveCheckIn = async (booking: any, securityUserId: string) => {
  const batch = writeBatch(db);
  
  // 1. Update booking
  const bookingRef = doc(db, 'bookings', booking.id);
  batch.update(bookingRef, {
    status: 'APPROVED',
    checkInTime: Date.now(),
    approvedBy: securityUserId,
    updatedAt: serverTimestamp()
  });

  // 2. Mark bay as occupied
  const bayRef = doc(db, `zones/${booking.zoneId}/bays/${booking.bayId}`);
  batch.update(bayRef, {
    status: 'occupied',
    updatedAt: serverTimestamp()
  });

  await batch.commit();
};

export const syncPendingCheckins = (callback: (bookings: any[]) => void) => {
  const q = query(collection(db, 'bookings'), where('status', '==', 'PENDING_CHECKIN'));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(bookings);
  }, (error) => {
    handleFirestoreError(error, 'list', 'bookings (pending checkins)');
  });
};

export const syncUserRole = (userId: string, callback: (role: string | null) => void) => {
  return onSnapshot(doc(db, 'roles', userId), (d) => {
    if (d.exists()) {
      callback(d.data().role);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, 'get', `roles/${userId}`);
  });
};

export const seedInitialData = async (initialZones: any[]) => {
  try {
    const zonesSnapshot = await getDocs(collection(db, 'zones'));
    if (zonesSnapshot.empty) {
      console.log("Seeding initial data...");
      for (const zone of initialZones) {
        const { bays, id, ...zoneData } = zone;
        const zoneRef = doc(db, 'zones', id);
        await setDoc(zoneRef, { ...zoneData, updatedAt: serverTimestamp() });
        
        for (const bay of bays) {
          const bayRef = doc(db, `zones/${id}/bays/${bay.id}`);
          await setDoc(bayRef, { ...bay, updatedAt: serverTimestamp() });
        }
      }
      console.log("Seeding complete.");
    }
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.log("Seeding skipped: Current user is not an admin.");
    } else {
      console.error("Error seeding initial data:", error);
    }
  }
};
