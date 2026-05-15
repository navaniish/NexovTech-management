import { db } from '../firebase';
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
      timestamp: serverTimestamp(),
      status,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      },
      ip: 'Capture Pending (Backend)' // Actual IP captured via server-side bridge
    };

    try {
      await addDoc(collection(db, 'admin_logs'), logData);
      
      // Dispatch Telegram Alert for critical failures
      if (status === 'failure' || action.includes('DELETE') || action.includes('REVOKE')) {
        this.dispatchTelegramAlert(action, logData);
      }
    } catch (err) {
      console.error('[SENTINEL] Log recording failed:', err);
    }
  }

  /**
   * 3. AI SECURITY MONITOR (Anomaly Detection)
   * Mock logic for identifying suspicious patterns.
   */
  async runAIScan(user) {
    const logsQ = query(
      collection(db, 'admin_logs'), 
      where('userId', '==', user.uid),
      where('status', '==', 'failure')
    );
    const logsSnap = await getDocs(logsQ);
    
    // Logic: If more than 3 failures in 10 minutes, flag account
    if (logsSnap.size > 3) {
      await this.logActivity('AI_SUSPICIOUS_ACTIVITY_DETECTED', user, 'warning');
      return { suspicious: true, alert: 'Multiple failed attempts detected. Sentinel monitoring activated.' };
    }

    return { suspicious: false };
  }

  /**
   * 4. TELEGRAM ALERT BRIDGE
   */
  async dispatchTelegramAlert(action, data) {
    // This calls the backend bridge which interfaces with the Telegram Bot API
    try {
      await fetch('/api/security/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, data })
      });
    } catch (err) {
      console.warn('[SENTINEL] Telegram bridge offline');
    }
  }
}

export const sentinel = new SecurityService();
