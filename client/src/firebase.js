import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCh5gR7GiU5Sq1beZCiGGN8RSTVwiYsooY",
  authDomain: "nexovtech-management.firebaseapp.com",
  projectId: "nexovtech-management",
  storageBucket: "nexovtech-management.firebasestorage.app",
  messagingSenderId: "24093704772",
  appId: "1:24093704772:web:a82e8590e57a594a6a3211",
  measurementId: "G-M9K5LB7NCL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
