const PRODUCTION_URL = 'https://nexovtech-management.netlify.app/api';

// Detect if we are in a native app environment via Capacitor
const isNative = !!window.Capacitor || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';

// Only use localhost if we are in a browser on localhost AND NOT in a native app
const isLocalDev = window.location.hostname === 'localhost' && !isNative;

const API_BASE = import.meta.env.VITE_API_URL || (isLocalDev ? 'http://localhost:5005/api' : PRODUCTION_URL);

export default API_BASE;
