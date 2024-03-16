// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { getFirestore } from 'firebase/firestore';
import 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDukmu2JJozXgcUhAkbjc4YJ_AxY7d347E",
    authDomain: "testing-samvaad-743bc.firebaseapp.com",
    projectId: "testing-samvaad-743bc",
    storageBucket: "testing-samvaad-743bc.appspot.com",
    messagingSenderId: "115400642734",
    appId: "1:115400642734:web:6b07109fbb4aa6a63c9d3f",
    measurementId: "G-ELLM1DB8ZM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});