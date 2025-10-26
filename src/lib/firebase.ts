import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAeJGbqKnRHeFpQ0wgQo4CF7eW-J7IMrfk",
  authDomain: "recordepisodes-f7722.firebaseapp.com",
  projectId: "recordepisodes-f7722",
  storageBucket: "recordepisodes-f7722.appspot.com",
  messagingSenderId: "1076612594881",
  appId: "1:1076612594881:web:60646896fa685d1d626840"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleAuthProvider = new GoogleAuthProvider();

export default app;
