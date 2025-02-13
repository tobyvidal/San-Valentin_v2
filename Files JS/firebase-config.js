// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
apiKey: "process.env.FIREBASE_API_KEY",
authDomain: "sanvalentin-725b7.firebaseapp.com",
projectId: "sanvalentin-725b7",
storageBucket: "sanvalentin-725b7.appspot.com",
messagingSenderId: "348954363146",
appId: "1:348954363146:web:c6f95c30559818c1a466f3",
measurementId: "G-S0VZPECLMF"
};

// Initialize Firebase
function initializeFirebase(){
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
}

// Export both the firebaseConfig and the initializeFirebase function
export { initializeFirebase };
