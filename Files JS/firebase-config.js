// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, 
  authDomain: process.env.AUTHDOMAINV,
  projectId: process.env.PROJECTID,
  storageBucket: process.env.STORAGEBUCKETV,
  messagingSenderId: process.env.MESSAGINGSENDERIDV,
  appId: process.env.APPID,
  measurementId: process.env.MEASUREMENTID
};


// Initialize Firebase
function initializeFirebase(){
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);
}

// Export both the firebaseConfig and the initializeFirebase function
export { initializeFirebase };
