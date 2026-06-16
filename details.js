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

const params = new URLSearchParams(window.location.search);
const productName = params.get('name');

async function loadData() {
    try {
        // UI Feedback: Show loading state immediately
        const detailView = document.getElementById('product-detail-view');
        if (detailView) {
            detailView.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 100px 20px; color: var(--orange);">
                    <p style="font-size: 1.5rem; font-weight: 800; animation: pulseLoader 1.5s infinite;">⌛ Loading product details...</p>
                </div>
            `;
        }

        const now = new Date().getTime();
        const CACHE_KEY = 'nimanja_products_cache';
        const CACHE_TIME_KEY = 'nimanja_products_cache_time';
        const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

        // Performance: Use the same localStorage cache as product.js
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);

        if (cachedData && cacheTime && (now - cacheTime < CACHE_DURATION)) {
            console.log("Loading product details from local cache...");
            const allProducts = JSON.parse(cachedData);
            if (processProductFromList(allProducts)) return;
        }

        // Point reference to 'web_data' where the script outputs JSON nodes
        const dataRef = ref(db, 'web_data');
        const snapshot = await get(dataRef);

        if (snapshot.exists()) {
            const firebaseData = snapshot.val();

            // Convert Firebase JSON object into an array structure for matching and similar products logic
            const allProducts = Object.keys(firebaseData).map(key => {
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

            // Save to local cache and update timestamp to sync with product.js
            localStorage.setItem(CACHE_KEY, JSON.stringify(allProducts));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
            processProductFromList(allProducts);
        } else {
            console.log("No data available in Firebase paths.");
        }

    } catch (error) {
        console.error("Error loading product details from Firebase:", error);
    }
}

/**
 * Performance helper to find the product and render UI
 */
function processProductFromList(allProducts) {
    if (!productName) return false;
    const targetName = decodeURIComponent(productName).trim().toLowerCase();
    
    let currentProduct = allProducts.find(p => p.name.trim().toLowerCase() === targetName);
    if (currentProduct) {
        // Normalization: Ensure extraImages is always an array, even if loaded 
        // from a cache that used a different key or string format.
        if (!currentProduct.extraImages || !Array.isArray(currentProduct.extraImages)) {
            const rawExtra = currentProduct.extraImages || currentProduct.extra || "";
            currentProduct.extraImages = (typeof rawExtra === 'string')
                ? rawExtra.split(';').map(img => img.trim()).filter(Boolean)
                : (Array.isArray(rawExtra) ? rawExtra : []);
        }

        renderDetails(currentProduct);
        renderAdditionalInfoCard(currentProduct);
        renderSimilar(currentProduct, allProducts);
        return true;
    }
    const detailView = document.getElementById('product-detail-view');
    if (detailView) {
        detailView.innerHTML = `<div style="text-align:center; padding: 50px;"><p>Product not found.</p><a href="product.html" style="color:var(--orange)">Back to Catalog</a></div>`;
    }
    return false;
}

function renderDetails(p) {
    const detailView = document.getElementById('product-detail-view');
    if (!detailView) return;

    const hasSibuDeal = p.sibuPrice && p.sibuPrice !== "" && p.sibuPrice !== "-";
    const hasMiriDeal = p.miriPrice && p.miriPrice !== "" && p.miriPrice !== "-";
    const hasBadge = p.dealType && p.dealType.trim() !== "";
    const hasBundle = p.bundlePrice && p.bundlePrice.trim() !== "" && p.bundlePrice.trim() !== "-";

    const currentProductUrl = window.location.href;
    
    const buildWhatsAppMessage = (branchName, activePromoPrice) => {
        // This function is no longer used for multiple buttons, but kept for reference if needed.
        // The new single button message is constructed directly.
        return "";
    };

    const buildSingleWhatsAppMessage = () => {
        let priceInfo = `*Normal Price:* RM ${p.price}`;
        if (hasSibuDeal) {
            priceInfo += `\n*Sibu Promo:* RM ${p.sibuPrice}`;
        }
        if (hasMiriDeal) {
            priceInfo += `\n*Miri Promo:* RM ${p.miriPrice}`;
        }
        if (hasBundle) {
            priceInfo += `\n*Bulk Deal:* ${p.bundlePrice}`;
        }
        return encodeURIComponent(`Hi Nimanja, I am interested in purchasing this item:\n\n*Product:* ${p.name}\n${priceInfo}\n\n*Product Link:* ${currentProductUrl}`);
        const promos = [];
        if (hasSibuDeal) promos.push(`Sibu RM${p.sibuPrice}`);
        if (hasMiriDeal) promos.push(`Miri RM${p.miriPrice}`);

        const dealStr = promos.length > 0 ? `\n• Deals: ${promos.join(' | ')}` : '';
        const bundleStr = hasBundle ? `\n• Bulk: ${p.bundlePrice}` : '';

        const message = `Hi Nimanja, interested in: *${p.name}*\n• Price: RM ${p.price}${dealStr}${bundleStr}\n\n${currentProductUrl}`;
        return encodeURIComponent(message);
    };
    
    let thumbsHtml = `<img src="${p.image}" onclick="changeMainImage(this.src)" class="thumb-img">`;

    // Defensive check: only iterate if extraImages exists and is an array
    if (p.extraImages && Array.isArray(p.extraImages)) {
        p.extraImages.forEach(imgUrl => {
            if (imgUrl) {
                thumbsHtml += `
                    <img 
                        src="${imgUrl}" 
                        onclick="changeMainImage(this.src)"
                        class="thumb-img"
                        onerror="this.style.display='none'"
                    >
                `;
            }
        });
    }

    // 1. Keeps the original main price prominent and exactly as it is 
    let priceContainerHtml = `<p class="detail-deal-price" style="color: var(--orange); font-size: 2.2rem; font-weight: 800; margin: 0;">RM ${p.price}</p>`;
    
    // 2. Separate side-by-side promo boxes with canceled original prices inside 
    if (hasSibuDeal || hasMiriDeal) {
        priceContainerHtml += `<div class="branch-promos-container" style="display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; margin-top: 12px; width: 100%;">`; 
        
        if (hasSibuDeal) {
            priceContainerHtml += `
                <div class="sibu-promo-box" style="flex: 1; min-width: 150px; max-width: fit-content; background: var(--peach-light); border: 1px dashed rgba(234, 101, 38, 0.4); padding: 10px 16px; border-radius: 12px;"> 
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--orange); text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">Available Promo:</span>
                    <span style="font-size: 0.85rem; text-decoration: line-through; color: #999; display: block; margin-bottom: 1px;">RM ${p.price}</span>
                    <p style="font-size: 1.25rem; margin: 0; color: var(--text-dark); font-weight: 700;">
                        Sibu: <span style="font-weight: 900; color: var(--orange);">RM ${p.sibuPrice}</span>
                    </p>
                </div>`;
        }
        
        if (hasMiriDeal) {
            priceContainerHtml += `
                <div class="miri-promo-box" style="flex: 1; min-width: 150px; max-width: fit-content; background: var(--peach-light); border: 1px dashed rgba(234, 101, 38, 0.4); padding: 10px 16px; border-radius: 12px;"> 
                    <span style="font-size: 0.75rem; font-weight: 800; color: var(--orange); text-transform: uppercase; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">Available Promo:</span>
                    <span style="font-size: 0.85rem; text-decoration: line-through; color: #999; display: block; margin-bottom: 1px;">RM ${p.price}</span>
                    <p style="font-size: 1.25rem; margin: 0; color: var(--text-dark); font-weight: 700;">
                        Miri: <span style="font-weight: 900; color: var(--orange);">RM ${p.miriPrice}</span>
                    </p>
                </div>`;
        }
        
        priceContainerHtml += `</div>`;
    }

    detailView.innerHTML = `
        <div class="image-gallery">
            <div class="main-img">
                <img id="featured" src="${p.image}" alt="${p.name}">
            </div>
            <div class="thumb-row">
                ${thumbsHtml}
            </div>
        </div>

        <div class="info-section">
            <div class="badge-share-row">
                ${hasBadge ? `<div class="detail-sale-badge">${p.dealType}</div>` : '<div></div>'}
                <button class="share-btn" onclick="shareProduct('${encodeURIComponent(p.name)}')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share Product
                </button>
            </div>

            <span class="tag">${p.category}</span>
            <h1 style="font-size: 2.3rem; margin: 10px 0; line-height: 1.2;">${p.name}</h1>

            <div class="detail-price-container" style="margin: 10px 0 20px 0;">
                ${priceContainerHtml}
                
                ${hasBundle ? `
                    <div class="detail-bundle-tag" style="margin-top: 10px;">
                         📦 Bulk Deal: ${p.bundlePrice}
                    </div>
                ` : ''}
            </div>

            <p class="product-description-text">${p.description || 'No description available for this item.'}</p>

            <div class="branch-order-box">
                <h4 class="branch-title">Order Instantly via Nearest Outlet:</h4>
                <div class="branch-buttons-grid single-button-grid">
                    <a href="https://wa.me/60105958353?text=${buildSingleWhatsAppMessage()}" class="whatsapp-branch-btn general-btn" target="_blank">
                        <span>Enquire on WhatsApp</span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

function renderAdditionalInfoCard(p) {
    const cardContainer = document.getElementById('additional-info-card');
    if (!cardContainer) return;

    if (p.additionalInfo && p.additionalInfo.trim() !== "") {
        cardContainer.innerHTML = `
            <div class="info-card-card">
                <h3 class="info-card-header">Product Specifications & Additional Information</h3>
                <div class="info-card-content">
                    <p class="info-body-text">${p.additionalInfo}</p>
                </div>
            </div>
        `;
    } else {
        cardContainer.innerHTML = "";
    }
}

async function shareProduct(encodedName) {
    const shareData = {
        title: decodeURIComponent(encodedName) + ' | Nimanja Petshop',
        text: 'Check out this awesome item I found at Nimanja Petshop!',
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            alert('Product hyperlink copied to clipboard! You can now share it anywhere.');
        }
    } catch (err) {
        console.log('Share action cancelled.');
    }
}

function renderSimilar(current, all) {
    const grid = document.getElementById('similar-products-grid');
    if (!grid) return;

    const similar = all
        .filter(p => p.category === current.category && p.name.toLowerCase() !== current.name.toLowerCase())
        .slice(0, 4);

    if (similar.length === 0) {
        grid.innerHTML = `<p>No similar products found.</p>`;
        return;
    }
    
    grid.innerHTML = similar.map(p => {
        const hasSibuDeal = p.sibuPrice && p.sibuPrice !== "" && p.sibuPrice !== "-";
        const hasMiriDeal = p.miriPrice && p.miriPrice !== "" && p.miriPrice !== "-";
        const hasAnyDeal = hasSibuDeal || hasMiriDeal;
        const hasBadge = p.dealType && p.dealType.trim() !== "";
        const hasBundle = p.bundlePrice && p.bundlePrice.trim() !== "" && p.bundlePrice.trim() !== "-";

        let priceHtml = "";
        if (hasAnyDeal) {
            priceHtml += `
                <div class="original-price-row">
                    <span class="price-label">Normal Price</span>
                    <span class="original-price">RM ${p.price}</span>
                </div>
                <div class="regional-deals-grid">
                    ${hasSibuDeal ? `
                        <div class="deal-location-badge sibu">
                            <span class="loc-tag">Sibu</span>
                            <span class="loc-price">RM ${p.sibuPrice}</span>
                        </div>
                    ` : ''}
                    ${hasMiriDeal ? `
                        <div class="deal-location-badge miri">
                            <span class="loc-tag">Miri</span>
                            <span class="loc-price">RM ${p.miriPrice}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            priceHtml += `
                <div class="standard-price-row">
                    <span class="price-label">Price</span>
                    <p class="price">RM ${p.price}</p>
                </div>
            `;
        }
        
        return `
            <div class="product-card" onclick="window.location.href='details.html?name=${encodeURIComponent(p.name)}'">
                ${hasBadge ? `<div class="sale-badge">${p.dealType}</div>` : ''}
                <div class="img-wrap">
                    <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300'">
                </div>
                <div class="product-info">
                    <span class="tag">${p.category}</span>
                    <h3>${p.name}</h3>
                    <div class="price-container">
                        ${priceHtml}
                        ${hasBundle ? `
                            <div class="bulk-deal-premium-badge">
                                <div class="bulk-label-row">
                                    <span class="bulk-icon">📦</span>
                                    <span class="bulk-title">Bulk Deal Available</span>
                                </div>
                                <div class="bulk-price-text">${p.bundlePrice}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function changeMainImage(src) {
    const featured = document.getElementById('featured');
    if (featured) featured.src = src;
}

// CRITICAL FIX: Expose the function globally so the inline HTML click listener can see it
window.changeMainImage = changeMainImage;
window.shareProduct = shareProduct; // Fixed for the share button too!

loadData();