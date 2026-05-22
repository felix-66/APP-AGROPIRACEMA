import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4ysrMnrbmnkzS_OaNKQOD4-Ykq2Xo3JE",
  authDomain: "agrocontrol-de10f.firebaseapp.com",
  projectId: "agrocontrol-de10f",
  storageBucket: "agrocontrol-de10f.firebasestorage.app",
  messagingSenderId: "949728722441",
  appId: "1:949728722441:web:56b9f55a488c9621e7c2d8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
