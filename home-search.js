/* home-search.js - Upgraded to Firebase Architecture with Mobile Navigation Drawer Handles */

// --- 1. Import Firebase Realtime Database SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// --- 2. Add Your Firebase Configuration ---
const firebaseConfig = {
  databaseURL: "https://nimanjaproducts-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    // ══════════════════════════════════════════════════
    // PART B: REALTIME SEARCH DROP-PANEL INTERACTION
    // ══════════════════════════════════════════════════
    const searchInput = document.getElementById('home-search-input');
    const resultsDropdown = document.getElementById('search-results-dropdown');
    const searchForm = document.getElementById('home-search-form');
    
    let allProducts = [];

    // Fetch structured real-time metrics data cleanly from Firebase
    async function fetchProducts() {
        try {
            // PERFORMANCE: Check session cache first to avoid redundant fetches on page transitions
            const cachedData = sessionStorage.getItem('nimanja_products_cache');
            if (cachedData) {
                allProducts = JSON.parse(cachedData);
                console.log("Predictive search initialized from session cache.");
                return;
            }

            const dataRef = ref(db, 'web_data');
            const snapshot = await get(dataRef);
            
            if (snapshot.exists()) {
                const firebaseData = snapshot.val();
                
                // Map fully to match the structure expected by catalog and details pages
                allProducts = Object.keys(firebaseData).map(key => {
                    const item = firebaseData[key] || {};
                    const rawExtra = item.extraImages || item.ExtraImages || "";
                    return {
                        name: (item.name || item.Name || "").trim(),
                        price: item.price || item.Price || "",
                        category: item.category || item.Category || "",
                        image: item.imageUrl || item.image || item.Image || "",
                        description: item.description || item.Description || "",
                        extraImages: (typeof rawExtra === 'string')
                            ? rawExtra.split(';').map(img => img.trim()).filter(Boolean)
                            : (Array.isArray(rawExtra) ? rawExtra : []),
                        brand: item.brand || item.Brand || "",
                        sibuPrice: item.sibuPromoPrice || item.sibuPrice || "",
                        dealType: item.dealType || item.DealType || "",
                        additionalInfo: item.additionalInfo || "",
                        bundlePrice: item.bundlePrice || "",
                        miriPrice: item.miriPrice || ""
                    };
                }).filter(p => p.name);
                
                // Save to cache for instant loading on subsequent pages
                sessionStorage.setItem('nimanja_products_cache', JSON.stringify(allProducts));
                console.log("Predictive homepage search framework synchronized with Firebase and cached.");
            }
        } catch (error) {
            console.error("Error loading search index from Firebase:", error);
        }
    }

    // Live instant keypress predictive text rendering matches handler
    if (searchInput && resultsDropdown) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            resultsDropdown.innerHTML = '';

            if (query.length > 0) {
                const matches = allProducts.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.category.toLowerCase().includes(query)
                ).slice(0, 5); // Restrict dropdown view layout threshold to top 5 hits

                if (matches.length > 0) {
                    matches.forEach(p => {
                        const item = document.createElement('div');
                        item.className = 'search-item';
                        item.innerHTML = `
                            <img src="${p.image}" onerror="this.src='https://via.placeholder.com/40'">
                            <div>
                                <h4>${p.name}</h4>
                                <p>RM ${p.price}</p>
                            </div>
                        `;
                        item.onclick = () => {
                            window.location.href = `details.html?name=${encodeURIComponent(p.name)}`;
                        };
                        resultsDropdown.appendChild(item);
                    });
                    resultsDropdown.style.display = 'block';
                } else {
                    resultsDropdown.style.display = 'none';
                }
            } else {
                resultsDropdown.style.display = 'none';
            }
        });
    }

    // Close predictive card element drop panel if background space is clicked out
    document.addEventListener('click', (e) => {
        if (searchForm && !searchForm.contains(e.target) && resultsDropdown) {
            resultsDropdown.style.display = 'none';
        }
    });

    // Handle form submit actions gracefully (Clicking search icon or hitting Enter key)
    if (searchForm && searchInput) {
        searchForm.onsubmit = (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `product.html?search=${encodeURIComponent(query)}`;
            }
        };
    }

    fetchProducts();
    
});