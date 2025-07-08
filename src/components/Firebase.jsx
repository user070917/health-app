// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정 (Firebase 콘솔에서 가져온 설정으로 교체해야 합니다)
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication과 Firestore 내보내기
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;