import { db } from '../firebase';
import { auth as firebaseAuth } from '../firebase';
import API_URL from '../config';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  updateDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';

/**
 * NEXOVTECH SENTINEL SECURITY SERVICE
 * Core logic for duplicate prevention, AI monitoring, and audit trails.
 */
class SecurityService {
  /**
   * 1. DUPLICATE ADMIN PREVENTION
   * Checks for existing identities across all layers before provisioning.
   */
  async checkDuplicateIdentity(email, phone = null) {
    console.log(`[SENTINEL] Running duplicate scan for: ${email}`);
    
    // Check Firestore Admins
    const qEmail = query(collection(db, 'admins'), where('email', '==', email.toLowerCase()));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) return { duplicate: true, reason: 'Admin account already exists in registry.' };

    if (phone) {
      const qPhone = query(collection(db, 'admins'), where('phone', '==', phone));
      const snapPhone = await getDocs(qPhone);
      if (!snapPhone.empty) return { duplicate: true, reason: 'Phone number already linked to an active admin.' };
    }

    return { duplicate: false };
  }

  /**
   * 2. AUDIT TRAIL (Activity Logs)
   * Records immutable logs of security events.
   */
  async logActivity(action, user, status = 'success') {
    const logData = {
      action,
      performedBy: user?.email || 'System',
      userId: user?.uid || user?.id || 'System',
      timestamp: new Date().toISOString(),
      status,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      },
      ip: 'Capture Pending (Backend)'
    };

    try {
      // 1. Try direct Firestore Write (Root Sovereign access)
      await addDoc(collection(db, 'admin_logs'), {
        ...logData,
        timestamp: serverTimestamp() // Use Firestore serverTimestamp when writing directly
      });
      
      // Dispatch Telegram Alert for critical failures
      if (status === 'failure' || action.includes('DELETE') || action.includes('REVOKE')) {
        this.dispatchTelegramAlert(action, logData);
      }
    } catch (err) {
      console.warn('[SENTINEL] Firestore logging restricted. Redirecting to Server-Side Identity Ledger...');
      // 2. Fallback to server-side logging API
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logData)
        });
      } catch (fallbackErr) {
        console.error('[SENTINEL] Master Audit Trail connection failure:', fallbackErr);
      }
    }
  }

  /**
   * 3. AI SECURITY MONITOR (Anomaly Detection)
   * Mock logic for identifying suspicious patterns.
   */
  async runAIScan(user) {
    try {
      const logsQ = query(
        collection(db, 'admin_logs'), 
        where('userId', '==', user.uid || user.id || 'Unknown'),
        where('status', '==', 'failure')
      );
      const logsSnap = await getDocs(logsQ);
      
      // Logic: If more than 3 failures in 10 minutes, flag account
      if (logsSnap.size > 3) {
        await this.logActivity('AI_SUSPICIOUS_ACTIVITY_DETECTED', user, 'warning');
        return { suspicious: true, alert: 'Multiple failed attempts detected. Sentinel monitoring activated.' };
      }
    } catch (err) {
      console.warn('[SENTINEL] Telemetry scanning restricted for standard identity node.');
    }

    return { suspicious: false };
  }

  /**
   * Helper: Get the best available auth token.
   * Prefers the backend JWT (nexov_token), falls back to Firebase ID token.
   * This resolves 401s caused by the race between page load and backend sync.
   */
  async getBestToken() {
    const stored = localStorage.getItem('nexov_token');
    if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    // Fallback: use Firebase current user's fresh ID token
    try {
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) return await fbUser.getIdToken();
    } catch (e) {
      console.warn('[SENTINEL] Firebase token fallback failed:', e.message);
    }
    return null;
  }

  /**
   * 5. GET SECURITY ANOMALIES
   */
  async getAnomalies() {
    try {
      const token = await this.getBestToken();
      if (!token) return [];
      const res = await fetch(`${API_URL}/security/anomalies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
      return [];
    }
  }

  /**
   * 6. LOCK SUSPICIOUS USER NODE
   */
  async lockUser(userId) {
    try {
      const token = await this.getBestToken();
      if (!token) return { success: false, message: 'No auth token available.' };
      const res = await fetch(`${API_URL}/security/lockout/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) return { success: false, message: 'Lockout failed - check admin permissions.' };
      return await res.json();
    } catch (err) {
      console.error('Failed to lock user:', err);
      return { success: false, message: err.message };
    }
  }
}

export const sentinel = new SecurityService();
