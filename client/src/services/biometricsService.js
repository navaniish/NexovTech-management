import API_URL from '../config';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { auth as firebaseAuth } from '../firebase';

class BiometricsService {
  /**
   * Returns the best available auth token.
   * Prefers the backend JWT; falls back to a fresh Firebase ID token.
   * Accepts an explicitly-passed token to allow callers to override.
   */
  async getBestToken(explicitToken = null) {
    if (explicitToken && explicitToken !== 'null' && explicitToken !== 'undefined') return explicitToken;
    const stored = localStorage.getItem('nexov_token');
    if (stored && stored !== 'null' && stored !== 'undefined') return stored;
    try {
      const fbUser = firebaseAuth.currentUser;
      if (fbUser) return await fbUser.getIdToken();
    } catch (e) {
      console.warn('[BIOMETRICS] Firebase token fallback failed:', e.message);
    }
    return null;
  }

  getBrowserFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'fingerprint_fallback';
      
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('NEXOV_ZERO_TRUST', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('NEXOV_ZERO_TRUST', 4, 17);
      
      // Dynamic anti-aliasing features
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(100, 25, 10, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
      
      const src = canvas.toDataURL();
      
      let hash = 0;
      for (let i = 0; i < src.length; i++) {
        const char = src.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      const canvasHash = Math.abs(hash).toString(16);
      const tz = new Date().getTimezoneOffset();
      const ua = navigator.userAgent;
      const screenDetails = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      
      const combinedRaw = `${canvasHash}_${tz}_${screenDetails}_${ua}`;
      let combinedHash = 0;
      for (let i = 0; i < combinedRaw.length; i++) {
        const char = combinedRaw.charCodeAt(i);
        combinedHash = ((combinedHash << 5) - combinedHash) + char;
        combinedHash = combinedHash & combinedHash;
      }
      
      return 'nex_' + Math.abs(combinedHash).toString(16);
    } catch (e) {
      console.error('Canvas fingerprinting error', e);
      return 'nex_fallback_' + Math.random().toString(36).substring(2, 15);
    }
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('nexovtech_device_id');
    if (!deviceId) {
      deviceId = this.getBrowserFingerprint();
      localStorage.setItem('nexovtech_device_id', deviceId);
    }
    return deviceId;
  }

  getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (userAgent.indexOf('Firefox') > -1) browser = 'Mozilla Firefox';
    else if (userAgent.indexOf('SamsungBrowser') > -1) browser = 'Samsung Internet';
    else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) browser = 'Opera';
    else if (userAgent.indexOf('Trident') > -1) browser = 'Internet Explorer';
    else if (userAgent.indexOf('Edge') > -1 || userAgent.indexOf('Edg') > -1) browser = 'Microsoft Edge';
    else if (userAgent.indexOf('Chrome') > -1) browser = 'Google Chrome';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Apple Safari';

    if (userAgent.indexOf('Windows NT 10.0') > -1) os = 'Windows 10/11';
    else if (userAgent.indexOf('Windows NT 6.2') > -1) os = 'Windows 8';
    else if (userAgent.indexOf('Windows NT 6.1') > -1) os = 'Windows 7';
    else if (userAgent.indexOf('Macintosh') > -1) os = 'macOS';
    else if (userAgent.indexOf('X11') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iPhone') > -1) os = 'iOS (iPhone)';
    else if (userAgent.indexOf('iPad') > -1) os = 'iOS (iPad)';

    return { browser, os, language: navigator.language || 'en-US' };
  }

  async enroll(userId, email, biometricTemplate, consent) {
    const token = await this.getBestToken();
    const res = await fetch(`${API_URL}/security/biometrics/enroll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ biometricTemplate, consent })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Enrollment failed');
    return data;
  }

  async verify(email, biometricTemplate, otpToken = null, livenessPassed = true) {
    const deviceId = this.getDeviceId();
    const deviceInfo = this.getDeviceInfo();

    const res = await fetch(`${API_URL}/security/biometrics/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        biometricTemplate,
        deviceId,
        deviceInfo,
        otpToken,
        livenessPassed
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');
    return data;
  }

  async verifyFingerprint(email) {
    const deviceId = this.getDeviceId();
    const res = await fetch(`${API_URL}/security/fingerprint/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        deviceId
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Fingerprint verification failed');
    return data;
  }

  async checkWebAuthnStatus(email) {
    const res = await fetch(`${API_URL}/security/webauthn/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to check fingerprint status.');
    return data; // { enrolled: boolean, userId: string }
  }

  async registerWebAuthnPublic(email) {
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await NativeBiometric.isAvailable();
        if (!available.isAvailable) {
          throw new Error('Biometric hardware is not configured or not available on this device.');
        }

        await NativeBiometric.verifyIdentity({
          reason: 'Authorize access to register physical fingerprint bypass key',
          title: 'Enroll Biometric Key',
          subtitle: 'Touch fingerprint sensor',
          description: 'Confirm identity to securely save biometric login credentials'
        });

        // On native, save credential to Keystore
        const token = localStorage.getItem('nexov_token') || localStorage.getItem('token') || '';
        if (!token) {
          throw new Error('Please log in with email/password once first to authorize native biometrics registration.');
        }

        await NativeBiometric.setCredentials({
          username: email.toLowerCase(),
          password: token,
          server: 'nexovtech.auth'
        });

        // Register on backend to mark user as enrolled
        const res = await fetch(`${API_URL}/security/webauthn/register-public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase(),
            credentialId: 'native_android_' + email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
            publicKey: 'native_android_key'
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save fingerprint enrollment state on server.');
        return { success: true, credentialId: 'native_android_' + email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') };
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userIdBuffer = new Uint8Array(16);
      window.crypto.getRandomValues(userIdBuffer);

      const options = {
        publicKey: {
          challenge,
          rp: {
            name: 'NexovTech Enterprise',
            id: window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: email,
            displayName: email
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256
            { type: 'public-key', alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // forces Touch ID / Windows Hello / fingerprint sensor
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'none'
        }
      };

      const credential = await navigator.credentials.create(options);
      if (!credential) throw new Error('Device did not return a credential. Ensure biometrics are configured on this device.');

      const credentialId = credential.id;
      const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

      let publicKeyBase64 = 'default_public_key';
      if (credential.response && credential.response.getPublicKey) {
        try {
          const pubKeyBuffer = credential.response.getPublicKey();
          if (pubKeyBuffer) publicKeyBase64 = bufferToBase64(pubKeyBuffer);
        } catch (e) {
          console.warn('Could not retrieve public key via getPublicKey():', e);
        }
      }
      if (publicKeyBase64 === 'default_public_key' && credential.response?.attestationObject) {
        publicKeyBase64 = bufferToBase64(credential.response.attestationObject);
      }

      const res = await fetch(`${API_URL}/security/webauthn/register-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, credentialId, publicKey: publicKeyBase64 })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save fingerprint on server.');
      return { success: true, credentialId };
    } catch (err) {
      console.error('WebAuthn public registration error:', err);
      throw err;
    }
  }

  /**
   * Smart login: checks status → registers on first use → authenticates
   * This is the main method called from the Login page for physical fingerprint.
   */
  async loginWithPhysicalFingerprint(email) {
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await NativeBiometric.isAvailable();
        if (!available.isAvailable) {
          throw new Error('Biometric hardware is not available on this device.');
        }

        // Try to check local credentials
        let hasLocalCredentials = false;
        try {
          const credentials = await NativeBiometric.getCredentials({ server: 'nexovtech.auth' });
          if (credentials && credentials.username === email.toLowerCase() && credentials.password) {
            hasLocalCredentials = true;
          }
        } catch (e) {
          // not found
        }

        if (!hasLocalCredentials) {
          throw new Error('No physical biometric key found for this email on this device. Please log in with password/Google first and enroll biometrics in Settings.');
        }

        return await this.authenticateWebAuthn(email);
      }
    } catch (e) {
      console.error('Native biometrics check failed:', e);
      throw e;
    }

    // Step 1: Check if credential already registered
    const status = await this.checkWebAuthnStatus(email);

    if (!status.enrolled) {
      // First time — register the physical sensor key
      await this.registerWebAuthnPublic(email);
    }

    // Step 2: Authenticate with the physical sensor
    return await this.authenticateWebAuthn(email);
  }

  async registerWebAuthn(email) {
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await NativeBiometric.isAvailable();
        if (!available.isAvailable) {
          throw new Error('Biometric hardware is not configured or not available on this device.');
        }

        await NativeBiometric.verifyIdentity({
          reason: 'Authorize access to register physical fingerprint bypass key',
          title: 'Enroll Biometric Key',
          subtitle: 'Touch fingerprint sensor',
          description: 'Confirm identity to securely save biometric login credentials'
        });

        // On native, save credential to Keystore
        const token = localStorage.getItem('nexov_token') || localStorage.getItem('token') || '';
        if (!token) {
          throw new Error('Authentication token missing. Please log in again.');
        }

        await NativeBiometric.setCredentials({
          username: email.toLowerCase(),
          password: token,
          server: 'nexovtech.auth'
        });

        // Register on backend to mark user as enrolled
        const res = await fetch(`${API_URL}/security/webauthn/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: email.toLowerCase(),
            credentialId: 'native_android_' + email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
            publicKey: 'native_android_key'
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to save fingerprint enrollment state on server.');
        return data;
      }

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userIdBuffer = new Uint8Array(16);
      window.crypto.getRandomValues(userIdBuffer);
      
      const options = {
        publicKey: {
          challenge,
          rp: {
            name: "NexovTech Enterprise",
            id: window.location.hostname
          },
          user: {
            id: userIdBuffer,
            name: email,
            displayName: email
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },   // ES256
            { type: "public-key", alg: -257 }  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform", // forces Touch ID / Windows Hello
            userVerification: "required",
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: "none"
        }
      };

      const credential = await navigator.credentials.create(options);
      if (!credential) throw new Error("No credential returned from device biometrics");

      const credentialId = credential.id;
      
      const bufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
      let publicKeyBase64 = 'default_public_key';
      if (credential.response && credential.response.getPublicKey) {
        try {
          const pubKeyBuffer = credential.response.getPublicKey();
          if (pubKeyBuffer) {
            publicKeyBase64 = bufferToBase64(pubKeyBuffer);
          }
        } catch (e) {
          console.warn("Could not retrieve public key using getPublicKey():", e);
        }
      }
      if (publicKeyBase64 === 'default_public_key' && credential.response && credential.response.attestationObject) {
        publicKeyBase64 = bufferToBase64(credential.response.attestationObject);
      }

      const token = localStorage.getItem('nexov_token') || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/security/webauthn/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email,
          credentialId,
          publicKey: publicKeyBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'WebAuthn registration failed on server');
      return data;
    } catch (err) {
      console.error("WebAuthn enrollment error:", err);
      throw err;
    }
  }

  async authenticateWebAuthn(email) {
    try {
      if (Capacitor.isNativePlatform()) {
        const available = await NativeBiometric.isAvailable();
        if (!available.isAvailable) {
          throw new Error('Biometrics not available on this device.');
        }

        await NativeBiometric.verifyIdentity({
          reason: 'Authenticate to access your NexovTech secure workspace',
          title: 'Biometric Verification',
          subtitle: 'Touch fingerprint sensor',
          description: 'Confirm identity to continue.'
        });

        // Retrieve stored credentials
        const credentials = await NativeBiometric.getCredentials({
          server: 'nexovtech.auth'
        });

        if (!credentials || credentials.username !== email.toLowerCase() || !credentials.password) {
          throw new Error('No local biometric credentials found for this account on this device. Please log in with password/Google once first.');
        }

        const token = credentials.password;

        // Verify token with backend
        const verifyRes = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!verifyRes.ok) {
          throw new Error('Stored biometric session has expired. Please log in with credentials once to refresh.');
        }

        const userData = await verifyRes.json();
        return {
          token,
          user: userData
        };
      }

      const challengeRes = await fetch(`${API_URL}/security/webauthn/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        throw new Error(challengeData.message || 'No system biometrics enrolled for this account.');
      }

      const { credentialId } = challengeData;

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const base64 = credentialId.replace(/-/g, '+').replace(/_/g, '/');
      const rawId = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      const options = {
        publicKey: {
          challenge,
          allowCredentials: [{
            type: "public-key",
            id: rawId
          }],
          userVerification: "required",
          timeout: 60000
        }
      };

      const assertion = await navigator.credentials.get(options);
      if (!assertion) throw new Error("Verification cancelled or failed on hardware");

      const verifyRes = await fetch(`${API_URL}/security/webauthn/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          credentialId
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.message || 'Biometric hardware authorization failed.');
      return verifyData;
    } catch (err) {
      console.error("WebAuthn authentication error:", err);
      throw err;
    }
  }

  async getStatus(userId) {
    const res = await fetch(`${API_URL}/security/biometrics/status/${userId}?t=${Date.now()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to retrieve biometrics status');
    return data;
  }

  async delete(token) {
    const resolvedToken = await this.getBestToken(token);
    const res = await fetch(`${API_URL}/security/biometrics/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${resolvedToken}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Deletion failed');
    return data;
  }

  async deleteWebAuthn(token) {
    const resolvedToken = await this.getBestToken(token);
    const res = await fetch(`${API_URL}/security/webauthn/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${resolvedToken}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Deletion failed');
    return data;
  }

  async getAdminLogs(token) {
    const resolvedToken = await this.getBestToken(token);
    const res = await fetch(`${API_URL}/security/biometrics/admin/logs`, {
      headers: {
        'Authorization': `Bearer ${resolvedToken}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch biometrics admin logs');
    return data;
  }

  async revoke(userId, token) {
    const resolvedToken = await this.getBestToken(token);
    const res = await fetch(`${API_URL}/security/biometrics/admin/revoke/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resolvedToken}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Revocation failed');
    return data;
  }

  async updateSettings(settings, token) {
    const resolvedToken = await this.getBestToken(token);
    const res = await fetch(`${API_URL}/security/biometrics/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resolvedToken}`
      },
      body: JSON.stringify({ settings })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update settings');
    return data;
  }
}

export default new BiometricsService();
