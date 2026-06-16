// analytics.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwGwpfBpIt-mrgxw3OXky1xruBO5p0Zf8",
  authDomain: "nimanjaproducts.firebaseapp.com",
  databaseURL: "https://nimanjaproducts-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "nimanjaproducts",
  storageBucket: "nimanjaproducts.firebasestorage.app",
  messagingSenderId: "899288144891",
  appId: "1:899288144891:web:2d0949c114d8fe54db095e",
  measurementId: "G-QVWVGW7CQ0"
};

// Initialize Firebase & Analytics globally
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase Analytics tracking initialized successfully.");