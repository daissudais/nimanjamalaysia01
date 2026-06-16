/* brands.js - Upgraded to Firebase Architecture with Improved Design System */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://nimanjaproducts-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function loadBrandProducts() {
    const params = new URLSearchParams(window.location.search);
    const brandName = params.get('brand');
    const titleElement = document.getElementById('brand-title');
    const container = document.getElementById('brand-catalog-container');
    const navSlider = document.getElementById('brand-nav-slider');
    const searchInput = document.getElementById('brand-search-input');
    const searchForm = document.getElementById('brand-search-form');

    container.innerHTML = `<div class="product-skeleton-loader">Fetching brand data...</div>`;

    try {
        let allProducts = [];
        const cachedData = sessionStorage.getItem('nimanja_products_cache');
        
        if (cachedData) {
            allProducts = JSON.parse(cachedData);
        } else {
            const dataRef = ref(db, 'web_data');
            const snapshot = await get(dataRef);
            if (snapshot.exists()) {
                const firebaseData = snapshot.val();
                allProducts = Object.keys(firebaseData).map(key => {
                    const item = firebaseData[key] || {};
                    return {
                        name: (item.name || item.Name || "").trim(),
                        price: item.price || item.Price || "",
                        category: item.category || item.Category || "",
                        image: item.imageUrl || item.image || item.Image || "",
                        brand: item.brand || item.Brand || "",
                        sibuPrice: item.sibuPromoPrice || item.sibuPrice || "",
                        miriPrice: item.miriPrice || "",
                        bundlePrice: item.bundlePrice || ""
                    };
                }).filter(p => p.name);
            }
        }

        // Populate Top Brand Navigation Slider
        const uniqueBrands = [...new Set(allProducts.map(p => p.brand).filter(b => b && b.length > 0))];
        uniqueBrands.sort();

        if (navSlider) {
            navSlider.innerHTML = uniqueBrands.map(brand => {
                const isActive = brandName && brand.toLowerCase() === brandName.toLowerCase();
                // Assumes logos are named matching the brand (e.g., "Keos" -> "keos.png")
                const logoPath = `images/brands/${brand.replace(/\s+/g, '').toLowerCase()}.png`;
                
                return `
                    <div class="brand-card ${isActive ? 'active' : ''}" onclick="window.location.href='brands.html?brand=${encodeURIComponent(brand)}'">
                        <img src="${logoPath}" alt="${brand}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                        <span style="display:none;">${brand}</span>
                    </div>
                `;
            }).join('');

            // Initialize Slider Arrows
            const prevBtn = document.getElementById('brand-prev');
            const nextBtn = document.getElementById('brand-next');
            if (prevBtn && nextBtn) {
                prevBtn.onclick = () => navSlider.scrollBy({ left: -300, behavior: 'smooth' });
                nextBtn.onclick = () => navSlider.scrollBy({ left: 300, behavior: 'smooth' });
            }
        }

        // Rendering Helpers for dynamic filtering
        const renderBrandDirectory = (brands) => {
            if (brands.length === 0) {
                container.innerHTML = `<p class="empty-state">No brands matching your search.</p>`;
                return;
            }
            container.innerHTML = brands.map(brand => {
                const logoPath = `images/brands/${brand.replace(/\s+/g, '').toLowerCase()}.png`;
                return `
                    <div class="brand-card" onclick="window.location.href='brands.html?brand=${encodeURIComponent(brand)}'">
                        <img src="${logoPath}" alt="${brand}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                        <span style="display:none;">${brand}</span>
                    </div>
                `;
            }).join('');
        };

        const renderProductCatalog = (products) => {
            if (products.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="emoji">🐾</div>
                        <h3>No Results Found</h3>
                        <p>No products match your search within ${brandName}.</p>
                    </div>`;
                return;
            }
            container.innerHTML = products.map(p => {
                const sibuPart = p.sibuPrice ? `<div class="deal-location-badge sibu"><span class="loc-tag">Sibu</span><span class="loc-price">RM ${p.sibuPrice}</span></div>` : '';
                const miriPart = p.miriPrice ? `<div class="deal-location-badge miri"><span class="loc-tag">Miri</span><span class="loc-price">RM ${p.miriPrice}</span></div>` : '';
                return `
                <div class="product-card" onclick="window.location.href='details.html?name=${encodeURIComponent(p.name)}'">
                    <div class="img-wrap"><img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300'"></div>
                    <div class="product-info">
                        <span class="tag">${p.category}</span>
                        <h3>${p.name}</h3>
                        <div class="price-container">
                            <div class="standard-price-row"><span class="price">RM ${p.price}</span></div>
                            <div class="regional-deals-grid">${sibuPart}${miriPart}</div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        };

        // Logic for "Our Brands" Directory View
        if (!brandName) {
            titleElement.innerText = "All Brands";
            renderBrandDirectory(uniqueBrands);
            
            if (searchInput) {
                const filterDirectory = () => {
                    const query = searchInput.value.toLowerCase().trim();
                    const filtered = uniqueBrands.filter(b => b.toLowerCase().includes(query));
                    renderBrandDirectory(filtered);
                };
                searchInput.addEventListener('input', filterDirectory);
                if (searchForm) {
                    searchForm.onsubmit = (e) => {
                        e.preventDefault(); // Stay on page and use current filtered view
                    };
                }
            }
            return;
        }

        titleElement.innerText = brandName;

        const filteredProducts = allProducts.filter(p => 
            p.brand && p.brand.toLowerCase() === brandName.toLowerCase()
        );

        if (filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="emoji">🐾</div>
                    <h3>No Products Found</h3>
                    <p>Currently no products available for ${brandName}.</p>
                    <a href="product.html" class="btn primary" style="margin-top:20px;">View All Products</a>
                </div>`;
            return;
        }

        // Logic for specific Brand Product View
        renderProductCatalog(filteredProducts);

        if (searchInput) {
            const filterCatalog = () => {
                const query = searchInput.value.toLowerCase().trim();
                const filtered = filteredProducts.filter(p => 
                    p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
                );
                renderProductCatalog(filtered);
            };
            searchInput.addEventListener('input', filterCatalog);
            if (searchForm) {
                searchForm.onsubmit = (e) => e.preventDefault();
            }
        }

    } catch (error) {
        console.error("Error loading brand products:", error);
        container.innerHTML = "<p>Error loading products. Please try again later.</p>";
    }
}

loadBrandProducts();