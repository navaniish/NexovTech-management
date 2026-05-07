const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5005/api' : '/api');

export default API_BASE;
