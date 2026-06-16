const axios = require('axios');

async function geoLookup(ip) {
  if (!ip) return null;
  
  // Normalize and clean IP
  let cleanIp = ip.trim();
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  // Quick check for local/private range addresses
  if (
    cleanIp === '127.0.0.1' || 
    cleanIp === '::1' || 
    cleanIp === 'localhost' ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.startsWith('172.17.') ||
    cleanIp.startsWith('172.18.') ||
    cleanIp.startsWith('172.19.') ||
    cleanIp.startsWith('172.20.') ||
    cleanIp.startsWith('172.21.') ||
    cleanIp.startsWith('172.22.') ||
    cleanIp.startsWith('172.23.') ||
    cleanIp.startsWith('172.24.') ||
    cleanIp.startsWith('172.25.') ||
    cleanIp.startsWith('172.26.') ||
    cleanIp.startsWith('172.27.') ||
    cleanIp.startsWith('172.28.') ||
    cleanIp.startsWith('172.29.') ||
    cleanIp.startsWith('172.30.') ||
    cleanIp.startsWith('172.31.')
  ) {
    return null;
  }

  try {
    // Try freeipapi.com (HTTPS) with a 2-second timeout
    const response = await axios.get(`https://freeipapi.com/api/json/${cleanIp}`, { timeout: 2000 });
    if (response.data && response.data.cityName) {
      return {
        city: response.data.cityName,
        region: response.data.regionName || '',
        country: response.data.countryName || '',
        timezone: response.data.timeZone || 'UTC'
      };
    }
  } catch (err) {
    console.warn(`Geo lookup failed via freeipapi for IP ${cleanIp}: ${err.message}`);
  }

  try {
    // Fallback to ip-api.com (HTTP) with a 2-second timeout
    const response = await axios.get(`http://ip-api.com/json/${cleanIp}`, { timeout: 2000 });
    if (response.data && response.data.status === 'success') {
      return {
        city: response.data.city || '',
        region: response.data.regionName || '',
        country: response.data.country || '',
        timezone: response.data.timezone || 'UTC'
      };
    }
  } catch (err) {
    console.warn(`Geo lookup failed via ip-api for IP ${cleanIp}: ${err.message}`);
  }

  return null;
}

module.exports = geoLookup;
