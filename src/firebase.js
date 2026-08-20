import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDkVjWI9H6iW7vy-nClxfV-hWYEHtPYn7c",
  authDomain: "gestao-adm-superior.firebaseapp.com",
  projectId: "gestao-adm-superior",
  storageBucket: "gestao-adm-superior.firebasestorage.app",
  messagingSenderId: "709791131338",
  appId: "1:709791131338:web:89ddaaebafc842f5f03633"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
