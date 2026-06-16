import API_URL from '../config';

class BiometricsService {
  getDeviceId() {
    let deviceId = localStorage.getItem('nexovtech_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
    const token = localStorage.getItem('nexov_token') || localStorage.getItem('token');
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

  async getStatus(userId) {
    const res = await fetch(`${API_URL}/security/biometrics/status/${userId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to retrieve biometrics status');
    return data;
  }

  async delete(token) {
    const res = await fetch(`${API_URL}/security/biometrics/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Deletion failed');
    return data;
  }

  async getAdminLogs(token) {
    const res = await fetch(`${API_URL}/security/biometrics/admin/logs`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch biometrics admin logs');
    return data;
  }

  async revoke(userId, token) {
    const res = await fetch(`${API_URL}/security/biometrics/admin/revoke/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Revocation failed');
    return data;
  }

  async updateSettings(settings, token) {
    const res = await fetch(`${API_URL}/security/biometrics/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ settings })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update settings');
    return data;
  }
}

export default new BiometricsService();
