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

let allDealProducts = [];
let filteredDealProducts = [];
let currentPage = 1;
const itemsPerPage = 16; 
let selectedDealTag = "All Deals"; // Default fallback
let selectedRegion = "sibu";       // Tracks regional price selection ('sibu' or 'miri')

// --- Simple Auto-Slider Logic ---
let currentSlide = 0;
function autoPlaySlides() {
    const wrapper = document.getElementById('slider-wrapper');
    const dots = document.querySelectorAll('.slider-dots .dot');
    if (!wrapper) return;
    
    currentSlide++;
    if (currentSlide > 2) currentSlide = 0;
    
    wrapper.style.transform = `translateX(-${currentSlide * 33.333}%)`;
    
    dots.forEach((dot, index) => {
        if (index === currentSlide) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}
setInterval(autoPlaySlides, 3000);

// --- Upgraded Firebase Loading Logic ---
async function loadDeals() {
    try {
        // 1. DETECT BROWSER REFRESH: If the user explicitly reloads the page, clear the cache
        const navigationEntry = performance.getEntriesByType('navigation')[0];
        if (navigationEntry && navigationEntry.type === 'reload') {
            localStorage.removeItem('nimanja_products_cache');
            localStorage.removeItem('nimanja_products_cache_time');
        }

        // UI Feedback: Show skeleton loader while fetching
        const container = document.getElementById('catalog-container');
        if (container) {
            container.innerHTML = `
                <div class="product-skeleton-loader">
                    <p>Loading active deals...</p>
                </div>
            `;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const promoParam = urlParams.get('promo');
        if (promoParam) {
            selectedDealTag = promoParam.trim();
        }

        const now = new Date().getTime();
        const CACHE_KEY = 'nimanja_products_cache';
        const CACHE_TIME_KEY = 'nimanja_products_cache_time';
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

        // Performance: Try loading from local cache first to save Firebase bandwidth
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

        if (cachedData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
            console.log("Loading deals from local cache... (Saving Firebase Bandwidth!)");
            const allProducts = JSON.parse(cachedData);
            processDealsData(allProducts);
            return;
        }

        console.log("Cache expired or empty. Fetching fresh data from Firebase...");
        const dataRef = ref(db, 'web_data');
        const snapshot = await get(dataRef);
        
        if (snapshot.exists()) {
            const firebaseData = snapshot.val();
            
            const allProducts = Object.keys(firebaseData).map(key => {
                const item = firebaseData[key] || {};
                return { 
                    name: (item.name || item.Name || "").trim(), 
                    price: item.price || item.Price || "", 
                    category: item.category || item.Category || "", 
                    image: item.imageUrl || item.image || item.Image || "", 
                    description: item.description || item.Description || "", 
                    extraImages: item.extraImages || item.ExtraImages || "",
                    brand: item.brand || item.Brand || "",     
                    sibuPrice: item.sibuPromoPrice || item.sibuPrice || "", 
                    dealType: item.dealType || item.DealType || "",       
                    miriPrice: item.miriPrice || ""      
                };
            }).filter(p => p.name);

            localStorage.setItem(CACHE_KEY, JSON.stringify(allProducts));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
            
            processDealsData(allProducts);
        } else {
            console.log("No data found in Firebase path 'web_data'.");
            if (cachedData) processDealsData(JSON.parse(cachedData));
        }
    } catch (error) {
        console.error("Error loading deals data from Firebase:", error);
        const cachedData = localStorage.getItem('nimanja_products_cache');
        if (cachedData) processDealsData(JSON.parse(cachedData));
    }
}

function processDealsData(allProducts) {
    allDealProducts = allProducts.filter(p => p.dealType && p.dealType.trim() !== "" && p.dealType.trim() !== "-");
    renderRegionSelector();
    populateDealFilters();
    applyDealsFilter();
}

// --- Dynamically inserts a toggle switch for Sibu / Miri branches ---
function renderRegionSelector() {
    const filterSection = document.querySelector('.deals-filter-section');
    if (!filterSection || document.getElementById('region-toggle-container')) return;

    const container = document.createElement('div');
    container.id = 'region-toggle-container';
    container.className = 'region-toggle-container';

    container.innerHTML = `
        <button id="btn-sibu" class="deal-tab active">📍 Sibu Promos</button>
        <button id="btn-miri" class="deal-tab">📍 Miri Promos</button>
    `;

    // Insert region selector right above the deal category filter tags
    filterSection.insertBefore(container, filterSection.firstChild);

    const sibuBtn = document.getElementById('btn-sibu');
    const miriBtn = document.getElementById('btn-miri');

    sibuBtn.onclick = () => {
        selectedRegion = 'sibu';
        sibuBtn.classList.add('active');
        miriBtn.classList.remove('active');
        applyDealsFilter(); 
    };

    miriBtn.onclick = () => {
        selectedRegion = 'miri';
        miriBtn.classList.add('active');
        sibuBtn.classList.remove('active');
        applyDealsFilter(); 
    };
}

function populateDealFilters() {
    const tagsContainer = document.getElementById('deal-tags-container');
    if (!tagsContainer) return;

    const uniqueTags = [...new Set(allDealProducts.map(p => p.dealType.trim()))];
    uniqueTags.sort();

    tagsContainer.innerHTML = '';
    
    const allBtn = document.createElement('button');
    allBtn.className = 'deal-tab' + (selectedDealTag === "All Deals" ? " active" : "");
    allBtn.setAttribute('data-tag', "All Deals");
    allBtn.textContent = "All Deals";
    tagsContainer.appendChild(allBtn);

    uniqueTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'deal-tab' + (selectedDealTag === tag ? " active" : "");
        btn.setAttribute('data-tag', tag);
        btn.textContent = tag;
        tagsContainer.appendChild(btn);
    });

    tagsContainer.onclick = (e) => {
        const button = e.target.closest('.deal-tab');
        if (!button) return;

        const allButtons = tagsContainer.querySelectorAll('.deal-tab');
        allButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        selectedDealTag = button.getAttribute('data-tag');
        applyDealsFilter();
    };
}

function applyDealsFilter() {
    let regionFiltered = allDealProducts.filter(p => {
        if (selectedRegion === 'miri') {
            return p.miriPrice && p.miriPrice.trim() !== "" && p.miriPrice.trim() !== "-";
        } else {
            return p.sibuPrice && p.sibuPrice.trim() !== "" && p.sibuPrice.trim() !== "-";
        }
    });

    if (selectedDealTag === "All Deals") {
        filteredDealProducts = regionFiltered;
    } else {
        filteredDealProducts = regionFiltered.filter(p => p.dealType.trim() === selectedDealTag);
    }

    currentPage = 1;
    renderDealsPage();
}

function renderDealsPage() {
    const container = document.getElementById('catalog-container');
    const topCounter = document.getElementById('page-counter-top');
    if (!container) return;

    const totalPages = Math.ceil(filteredDealProducts.length / itemsPerPage) || 1;
    
    if (topCounter) {
        topCounter.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredDealProducts.slice(start, start + itemsPerPage);

    if (paginatedItems.length === 0) {
        container.innerHTML = `<p class="no-deals-message">No active promotions available under this tab for the selected branch.</p>`;
        renderPagination();
        return;
    }

    // PERFORMANCE: Use string mapping and join to render once, significantly reducing DOM reflows
    const html = paginatedItems.map(product => {
        let dealPriceHtml = "";
        if (selectedRegion === 'miri') {
            dealPriceHtml = `
                <div class="deal-price-box miri-box">
                    <span class="branch-label">Miri Promo</span>
                    <span class="branch-price">RM ${product.miriPrice}</span>
                </div>`;
        } else {
            dealPriceHtml = `
                <div class="deal-price-box sibu-box">
                    <span class="branch-label">Sibu Promo</span>
                    <span class="branch-price">RM ${product.sibuPrice}</span>
                </div>`;
        }
        
        return `
          <div class="product-card" onclick="window.location.href='details.html?name=${encodeURIComponent(product.name)}'">
            <div class="sale-badge">${product.dealType}</div>
            <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300'">
            <div class="product-info" style="padding: 15px;">
                <span class="tag">${product.category}</span>
                <h3 style="font-size: 0.9rem; margin-bottom: 10px; min-height: 38px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${product.name}</h3>
                <div class="price-container" style="display: flex; flex-direction: column; gap: 8px;">
                    <p class="original-price" style="font-size: 0.8rem; text-decoration: line-through; color: #999; margin: 0;">Normal Price: RM ${product.price}</p>
                    ${dealPriceHtml}
                </div>
            </div>
          </div>
        `;
    }).join('');

    container.innerHTML = html;

    renderPagination();
}

function renderPagination() {
    const paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = ""; 

    const totalPages = Math.ceil(filteredDealProducts.length / itemsPerPage);
    if (totalPages <= 1) return;

    const createPageButton = (pageNo, content) => {
        const btn = document.createElement('a');
        btn.href = "#";
        btn.innerHTML = content;
        btn.className = "page-btn";
        if (pageNo === currentPage) btn.classList.add("active");
        
        btn.onclick = (e) => {
            e.preventDefault();
            currentPage = pageNo;
            renderDealsPage();
            window.scrollTo(0, 0);
        };
        return btn;
    };

    const createEllipsisNode = () => {
        const span = document.createElement('span');
        span.innerText = "...";
        span.className = "page-ellipsis";
        return span;
    };

    const prevBtn = document.createElement('a');
    prevBtn.href = "#";
    prevBtn.innerHTML = "&laquo;";
    prevBtn.className = "page-btn arrow" + (currentPage === 1 ? " disabled" : "");
    prevBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            renderDealsPage();
            window.scrollTo(0, 0);
        }
    };
    paginationContainer.appendChild(prevBtn);

    const maxVisiblePages = 5; 
    
    if (totalPages <= maxVisiblePages + 2) {
        for (let i = 1; i <= totalPages; i++) {
            paginationContainer.appendChild(createPageButton(i, i));
        }
    } else {
        paginationContainer.appendChild(createPageButton(1, 1));

        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) {
            endPage = 4;
        } else if (currentPage >= totalPages - 2) {
            startPage = totalPages - 3;
        }

        if (startPage > 2) {
            paginationContainer.appendChild(createEllipsisNode());
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageButton(i, i));
        }

        if (endPage < totalPages - 1) {
            paginationContainer.appendChild(createEllipsisNode());
        }

        paginationContainer.appendChild(createPageButton(totalPages, totalPages));
    }

    const nextBtn = document.createElement('a');
    nextBtn.href = "#";
    nextBtn.innerHTML = "&raquo;";
    nextBtn.className = "page-btn arrow" + (currentPage === totalPages ? " disabled" : "");
    nextBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            renderDealsPage();
            window.scrollTo(0, 0);
        }
    };
    paginationContainer.appendChild(nextBtn);
}

loadDeals();