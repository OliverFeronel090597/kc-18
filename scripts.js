// ============================================
// KC@18 GALLERY - Enhanced with Fast Loading & Notifications
// Features: Parallel loading, notifications, cache stats
// ============================================

// Configuration
const LOW_QUALITY_FOLDER = 'KCat18_LQ';
const ORIGINAL_FOLDER = 'KCat18';
const HEADER_IMAGE_BASE = '72';
const TOTAL_IMAGES = 203;
const DB_NAME = 'KC18_Gallery';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const PARALLEL_LOAD_COUNT = 10; // Load 10 images at once

// Global state
let images = [];
let currentImageIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let audio = null;
let clickTimeout = null;
let db = null;
let loadingComplete = false;

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(title, message, type = 'info', duration = 3000) {
    // Create notification element if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
        cursor: pointer;
        font-size: 14px;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;
    
    notification.onclick = () => notification.remove();
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// ============================================
// INDEXEDDB FUNCTIONS
// ============================================

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp');
            }
        };
    });
}

function getCachedImage(imageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve(null);
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(imageId);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

function saveImageToCache(imageId, imageUrl, blob) {
    return new Promise((resolve, reject) => {
        if (!db) {
            resolve(false);
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const imageData = {
            id: imageId,
            url: imageUrl,
            blob: blob,
            timestamp: Date.now()
        };
        
        const request = store.put(imageData);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
    });
}

async function getCacheStats() {
    if (!db) return { total: 0, size: 0 };
    
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
            resolve({ total: countRequest.result, size: 'Unknown' });
        };
        countRequest.onerror = () => resolve({ total: 0, size: 0 });
    });
}

// ============================================
// FAST PARALLEL IMAGE LOADING
// ============================================

async function loadImageWithCache(imageNumber, imageUrl) {
    const imageId = `img_${imageNumber}`;
    
    // Check cache first
    const cached = await getCachedImage(imageId);
    
    if (cached && cached.blob) {
        const blobUrl = URL.createObjectURL(cached.blob);
        return { url: blobUrl, fromCache: true, imageId };
    }
    
    // Download from network
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('Network error');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Save to cache in background (don't wait)
        saveImageToCache(imageId, imageUrl, blob).catch(console.error);
        
        return { url: blobUrl, fromCache: false, imageId };
    } catch (error) {
        console.error(`Failed to load image ${imageNumber}:`, error);
        return null;
    }
}

// Load images in parallel batches
async function loadImagesInParallel(startIndex, endIndex, onProgress) {
    const promises = [];
    const results = [];
    
    for (let i = startIndex; i <= endIndex; i++) {
        const imageUrl = `${LOW_QUALITY_FOLDER}/${i}.JPG`;
        promises.push(loadImageWithCache(i, imageUrl));
    }
    
    const loadedResults = await Promise.all(promises);
    
    for (let i = 0; i < loadedResults.length; i++) {
        const result = loadedResults[i];
        if (result) {
            results.push({
                index: startIndex + i,
                ...result
            });
        }
        if (onProgress) onProgress(startIndex + i);
    }
    
    return results;
}

// ============================================
// DISPLAY PHOTOS WITH FAST PARALLEL LOADING
// ============================================

async function displayPhotos() {
    const grid = document.getElementById('imageGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    images = [];
    
    // Show loading bar
    const loadingBar = document.getElementById('loadingBar');
    const progressBar = document.getElementById('loadingProgress');
    if (loadingBar) {
        loadingBar.style.display = 'block';
        loadingBar.style.opacity = '1';
        if (progressBar) progressBar.style.width = '0%';
    }
    
    // Create all cards first (skeleton)
    const cards = [];
    for (let i = 1; i <= TOTAL_IMAGES; i++) {
        const card = document.createElement("div");
        card.classList.add("grid-card");
        card.style.animationDelay = `${(i % 20) * 0.02}s`;
        
        card.innerHTML = `
            <div class="card-image">
                <div class="skeleton"></div>
                <img data-src="" alt="Photo ${i}" loading="lazy">
                <div class="card-info">
                    <span class="card-date">📅 Photo ${i}</span>
                    <span class="card-name">📷 Image ${i}</span>
                </div>
                <div class="card-overlay">
                    <button class="download-card-btn" onclick="event.stopPropagation(); downloadOriginal(${i})">
                        📥 Download Original
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
        cards.push(card);
        images.push(`${ORIGINAL_FOLDER}/${i}.JPG`);
        
        // Add event listeners
        card.addEventListener("dblclick", function (e) {
            e.preventDefault();
            e.stopPropagation();
            currentImageIndex = i - 1;
            openModal(images[currentImageIndex]);
        });
        
        card.addEventListener("click", function (e) {
            if (e.target.classList.contains('download-card-btn')) return;
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                card.classList.toggle("selected");
            }, 200);
        });
    }
    
    // Check cache stats first
    const cacheStats = await getCacheStats();
    if (cacheStats.total > 0) {
        showNotification('📦 Cache Ready', `${cacheStats.total} images loaded from cache`, 'success', 2000);
    } else {
        showNotification('📥 First Time Loading', 'Downloading images for faster future visits...', 'info', 3000);
    }
    
    // Load images in parallel batches
    let loadedCount = 0;
    let cachedCount = 0;
    let networkCount = 0;
    
    const startTime = Date.now();
    
    for (let batch = 1; batch <= TOTAL_IMAGES; batch += PARALLEL_LOAD_COUNT) {
        const end = Math.min(batch + PARALLEL_LOAD_COUNT - 1, TOTAL_IMAGES);
        
        const results = await loadImagesInParallel(batch, end, (index) => {
            loadedCount++;
            if (progressBar) {
                progressBar.style.width = `${(loadedCount / TOTAL_IMAGES) * 100}%`;
            }
        });
        
        // Update cards with loaded images
        for (const result of results) {
            const card = cards[result.index - 1];
            const img = card.querySelector('img');
            const skeleton = card.querySelector('.skeleton');
            
            img.src = result.url;
            img.classList.add('loaded');
            if (skeleton) skeleton.style.display = 'none';
            
            if (result.fromCache) {
                cachedCount++;
            } else {
                networkCount++;
            }
        }
        
        // Update stats
        const statsEl = document.getElementById('stats');
        if (statsEl && !loadingComplete) {
            const percent = Math.round((loadedCount / TOTAL_IMAGES) * 100);
            statsEl.textContent = `📸 Loading ${percent}% • 💾 ${cachedCount} cached • 🌐 ${networkCount} new`;
        }
    }
    
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Show completion notification
    if (networkCount > 0) {
        showNotification('✅ Gallery Ready!', `${TOTAL_IMAGES} images loaded in ${loadTime}s • ${cachedCount} from cache`, 'success', 4000);
    } else {
        showNotification('⚡ Fully Cached!', `All ${TOTAL_IMAGES} images loaded from cache in ${loadTime}s`, 'success', 3000);
    }
    
    loadingComplete = true;
    updateStats();
    
    // Hide loading bar
    setTimeout(() => {
        if (loadingBar) {
            loadingBar.style.opacity = '0';
            setTimeout(() => {
                loadingBar.style.display = 'none';
            }, 500);
        }
    }, 1000);
}

function updateStats() {
    const statsEl = document.getElementById('stats');
    const imageCountEl = document.getElementById('imageCount');
    if (statsEl) statsEl.textContent = `📸 ${TOTAL_IMAGES} images • Click to select`;
    if (imageCountEl) imageCountEl.textContent = `${TOTAL_IMAGES} Moments Captured`;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openModal(imageSrc) {
    const modal = document.getElementById("fullscreenModal");
    const modalImg = document.getElementById("fullscreenImage");
    const info = document.getElementById("fullscreenInfo");
    if (!modal || !modalImg) return;
    
    modal.classList.add("active");
    modalImg.src = imageSrc;
    if (info) {
        const num = currentImageIndex + 1;
        info.textContent = `Photo ${num} of ${TOTAL_IMAGES}`;
    }
}

function closeModal() {
    const modal = document.getElementById("fullscreenModal");
    if (modal) modal.classList.remove("active");
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    const modalImg = document.getElementById("fullscreenImage");
    const info = document.getElementById("fullscreenInfo");
    if (modalImg) {
        modalImg.src = images[currentImageIndex];
        if (info) {
            const num = currentImageIndex + 1;
            info.textContent = `Photo ${num} of ${TOTAL_IMAGES}`;
        }
    }
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
    const modalImg = document.getElementById("fullscreenImage");
    const info = document.getElementById("fullscreenInfo");
    if (modalImg) {
        modalImg.src = images[currentImageIndex];
        if (info) {
            const num = currentImageIndex + 1;
            info.textContent = `Photo ${num} of ${TOTAL_IMAGES}`;
        }
    }
}

// ============================================
// DOWNLOAD FUNCTIONS WITH NOTIFICATIONS
// ============================================

function downloadOriginal(imageNumber) {
    const link = document.createElement('a');
    link.href = `${ORIGINAL_FOLDER}/${imageNumber}.JPG`;
    link.download = `KC18_${imageNumber}.JPG`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('⬇️ Download Started', `Photo ${imageNumber} is downloading`, 'info', 1500);
}

function showTempMessage(message) {
    const statsEl = document.getElementById('stats');
    if (!statsEl) return;
    const original = statsEl.textContent;
    statsEl.textContent = message;
    setTimeout(() => {
        if (statsEl.textContent === message) {
            statsEl.textContent = original;
        }
    }, 2000);
}

function showDownloadPopup() {
    const popup = document.getElementById("popupOverlay");
    if (popup) popup.style.display = "flex";
}

function confirmDownload() {
    const popup = document.getElementById("popupOverlay");
    if (popup) popup.style.display = "none";
    
    const selectedCards = document.querySelectorAll('.grid-card.selected');
    const selectedNumbers = [];
    
    selectedCards.forEach(card => {
        const dateSpan = card.querySelector('.card-date');
        if (dateSpan) {
            const match = dateSpan.textContent.match(/\d+/);
            if (match) selectedNumbers.push(parseInt(match[0]));
        }
    });
    
    if (selectedNumbers.length === 0) {
        showNotification('⚠️ No Selection', 'Please click on images to select them first', 'warning', 2000);
        return;
    }
    
    showNotification('📥 Download Started', `Downloading ${selectedNumbers.length} images...`, 'info', 2000);
    
    selectedNumbers.forEach((imageNum, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `${ORIGINAL_FOLDER}/${imageNum}.JPG`;
            link.download = `KC18_${imageNum}.JPG`;
            link.click();
        }, index * 200);
    });
    
    showTempMessage(`📥 Downloading ${selectedNumbers.length} images...`);
}

function cancelDownload() {
    const popup = document.getElementById("popupOverlay");
    if (popup) popup.style.display = "none";
}

function downloadAllOriginals() {
    const cards = document.querySelectorAll('.grid-card');
    cards.forEach(card => {
        card.classList.add('selected');
    });
    showDownloadPopup();
}

// ============================================
// HELP POPUP
// ============================================

function showHelpPopup() {
    const popup = document.getElementById("helpPopupOverlay");
    if (popup) popup.style.display = "flex";
}

function closeHelpPopup() {
    const popup = document.getElementById("helpPopupOverlay");
    if (popup) popup.style.display = "none";
}

// ============================================
// AUTO-PLAY FUNCTIONALITY
// ============================================

function initAudio() {
    try {
        audio = document.getElementById("bg-music");
        if (audio) {
            audio.loop = true;
            audio.volume = 0.5;
        }
    } catch (e) {
        console.log('Audio init failed:', e);
    }
}

function startMusic() {
    if (audio) {
        audio.play().catch(e => console.log('Audio play blocked:', e));
    }
}

function stopMusic() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function startAutoPlay() {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    if (images.length === 0) return;
    
    isAutoPlaying = true;
    startMusic();
    openModal(images[0]);
    currentImageIndex = 0;
    
    autoPlayInterval = setInterval(() => {
        nextImage();
    }, 4000);
    
    showNotification('🎬 Auto-Play Started', 'Playing slideshow with One Direction - 18', 'success', 2000);
    const statsEl = document.getElementById('stats');
    if (statsEl) statsEl.textContent = `🎬 AUTO-PLAY ACTIVE • Playing: One Direction - 18`;
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    isAutoPlaying = false;
    stopMusic();
    closeModal();
    updateStats();
    showNotification('⏹️ Auto-Play Stopped', 'Slideshow has been stopped', 'info', 1500);
}

// ============================================
// HEADER IMAGE LOADING WITH NOTIFICATION
// ============================================

async function loadHeaderImage() {
    const heroImg = document.getElementById('heroImage');
    if (!heroImg) return;
    
    const result = await loadImageWithCache('header', `${ORIGINAL_FOLDER}/${HEADER_IMAGE_BASE}.JPG`);
    
    if (result) {
        heroImg.src = result.url;
        heroImg.style.display = 'block';
    } else {
        const fallbackResult = await loadImageWithCache('header_fallback', `${LOW_QUALITY_FOLDER}/${HEADER_IMAGE_BASE}.JPG`);
        if (fallbackResult) {
            heroImg.src = fallbackResult.url;
            heroImg.style.display = 'block';
        } else {
            heroImg.style.display = 'none';
        }
    }
}

// ============================================
// SORT FUNCTIONALITY
// ============================================

function sortImages(sortType) {
    const grid = document.getElementById('imageGrid');
    if (!grid) return;
    
    const cards = Array.from(grid.children);
    
    cards.sort((a, b) => {
        const numA = parseInt(a.querySelector('.card-date')?.textContent.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.querySelector('.card-date')?.textContent.match(/\d+/)?.[0] || 0);
        
        switch (sortType) {
            case 'date-oldest':
                return numA - numB;
            case 'date-newest':
                return numB - numA;
            case 'name-asc':
                return numA - numB;
            case 'name-desc':
                return numB - numA;
            default:
                return 0;
        }
    });
    
    cards.forEach(card => grid.appendChild(card));
    showNotification('🔄 Sorted', `Images sorted by ${sortType.replace('-', ' ')}`, 'info', 1000);
}

// ============================================
// CLEAR CACHE FUNCTION (Optional)
// ============================================

async function clearCache() {
    if (!db) return;
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
    
    showNotification('🗑️ Cache Cleared', 'All cached images have been cleared', 'warning', 2000);
    setTimeout(() => location.reload(), 1000);
}

// ============================================
// FLOATING BUTTONS (Draggable)
// ============================================

let isDraggingDownloadButton = false;
let isDraggingHelpButton = false;

function makeButtonMovable(button, isDraggingFlag) {
    if (!button) return;
    
    let offsetX, offsetY;
    let isDragging = false;
    
    button.addEventListener("mousedown", (e) => {
        if (e.target === button) {
            isDragging = true;
            window[isDraggingFlag] = true;
            offsetX = e.clientX - button.offsetLeft;
            offsetY = e.clientY - button.offsetTop;
            button.style.transition = "none";
            e.preventDefault();
        }
    });
    
    window.addEventListener("mousemove", (e) => {
        if (window[isDraggingFlag]) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            
            newLeft = Math.max(0, Math.min(window.innerWidth - button.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - button.offsetHeight, newTop));
            
            button.style.left = `${newLeft}px`;
            button.style.top = `${newTop}px`;
            button.style.right = 'auto';
            button.style.bottom = 'auto';
        }
    });
    
    window.addEventListener("mouseup", () => {
        if (window[isDraggingFlag]) {
            window[isDraggingFlag] = false;
            button.style.transition = "all 0.3s ease";
            setTimeout(() => { isDragging = false; }, 100);
        }
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function bindEvents() {
    const modal = document.getElementById("fullscreenModal");
    const closeBtn = document.getElementById("fullscreenClose");
    const prevBtn = document.getElementById("fullscreenPrev");
    const nextBtn = document.getElementById("fullscreenNext");
    
    if (closeBtn) closeBtn.addEventListener("click", stopAutoPlay);
    if (prevBtn) prevBtn.addEventListener("click", () => {
        prevImage();
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => nextImage(), 4000);
        }
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
        nextImage();
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => nextImage(), 4000);
        }
    });
    
    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) stopAutoPlay();
        });
    }
    
    // Keyboard navigation
    window.addEventListener("keydown", function (event) {
        const modalEl = document.getElementById("fullscreenModal");
        if (modalEl && modalEl.classList.contains("active")) {
            if (event.key === "ArrowLeft") {
                prevImage();
                if (autoPlayInterval) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = setInterval(() => nextImage(), 4000);
                }
            } else if (event.key === "ArrowRight") {
                nextImage();
                if (autoPlayInterval) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = setInterval(() => nextImage(), 4000);
                }
            } else if (event.key === "Escape") {
                stopAutoPlay();
            }
        }
    });
    
    // Swipe gestures
    let touchstartX = 0;
    let touchendX = 0;
    
    if (modal) {
        modal.addEventListener('touchstart', function (event) {
            touchstartX = event.changedTouches[0].screenX;
        });
        
        modal.addEventListener('touchend', function (event) {
            touchendX = event.changedTouches[0].screenX;
            if (touchendX < touchstartX - 50) {
                nextImage();
                if (autoPlayInterval) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = setInterval(() => nextImage(), 4000);
                }
            }
            if (touchendX > touchstartX + 50) {
                prevImage();
                if (autoPlayInterval) {
                    clearInterval(autoPlayInterval);
                    autoPlayInterval = setInterval(() => nextImage(), 4000);
                }
            }
        });
    }
    
    // Sort buttons
    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sortType = btn.getAttribute('data-sort');
            if (sortType) {
                sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sortImages(sortType);
                if (isAutoPlaying) stopAutoPlay();
            }
        });
    });
    
    // Control buttons
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    
    if (autoPlayBtn) autoPlayBtn.addEventListener('click', startAutoPlay);
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllOriginals);
    if (refreshBtn) refreshBtn.addEventListener('click', () => location.reload());
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    showNotification('🚀 Starting Gallery', 'Loading KC@18 Debut Gallery...', 'info', 1500);
    
    // Open IndexedDB first
    try {
        await openDatabase();
        console.log('Cache database ready');
    } catch (error) {
        console.error('Failed to open cache:', error);
    }
    
    bindEvents();
    await loadHeaderImage();
    await displayPhotos();
    initAudio();
    
    // Setup floating buttons
    const floatingDownloadButton = document.getElementById('floating-download-button');
    const floatingHelpButton = document.getElementById('floating-help-button');
    
    if (floatingDownloadButton) {
        makeButtonMovable(floatingDownloadButton, 'isDraggingDownloadButton');
        floatingDownloadButton.addEventListener('click', showDownloadPopup);
    }
    
    if (floatingHelpButton) {
        makeButtonMovable(floatingHelpButton, 'isDraggingHelpButton');
        floatingHelpButton.addEventListener('click', showHelpPopup);
    }
    
    // Add clear cache option to help popup (optional)
    const helpContent = document.querySelector('#helpPopupOverlay .popup-content');
    if (helpContent && !document.getElementById('clearCacheBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearCacheBtn';
        clearBtn.textContent = '🗑️ Clear Cache';
        clearBtn.style.cssText = 'background: #dc2626; color: white; margin-top: 10px;';
        clearBtn.onclick = async () => {
            await clearCache();
            closeHelpPopup();
        };
        helpContent.appendChild(clearBtn);
    }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}