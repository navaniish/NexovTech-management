const PRODUCTION_URL = import.meta.env.VITE_PRODUCTION_URL || 'https://nexovtech-management.vercel.app/api';

// Detect if we are in a native app environment via Capacitor
const isNative = !!window.Capacitor || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';

// Only use localhost if we are in a browser on localhost AND NOT in a native app
const PORT = import.meta.env.VITE_PORT || 5006;
const isLocalDev = window.location.hostname === 'localhost' && !isNative;

const API_BASE = isLocalDev ? `http://localhost:${PORT}/api` : (import.meta.env.VITE_API_URL || PRODUCTION_URL);

export default API_BASE;
