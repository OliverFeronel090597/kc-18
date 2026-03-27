// ============================================
// KC@18 GALLERY - Complete Optimized Version
// Features: Fast loading, notifications, cache, draggable buttons, 
// Auto-play with pause, spacebar pause, long-press for mobile, swipe navigation
// ============================================

// Configuration
const LOW_QUALITY_FOLDER = 'KCat18_LQ';
const ORIGINAL_FOLDER = 'KCat18';
const HEADER_IMAGE_BASE = '72';
const TOTAL_IMAGES = 203;
const DB_NAME = 'KC18_Gallery';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const PARALLEL_LOAD_COUNT = 10;

// Global state
let images = [];
let currentImageIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let isPaused = false;
let audio = null;
let clickTimeout = null;
let db = null;
let loadingComplete = false;
let isDraggingDownloadButton = false;
let isDraggingHelpButton = false;
let dragStartX = 0;
let dragStartY = 0;
let longPressTimer = null;
let isLongPressing = false;

// ============================================
// NOTIFICATION SYSTEM - Red & Black Theme
// ============================================

function showNotification(title, message, type = 'info', duration = 3000) {
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 350px;
        `;
        document.body.appendChild(notificationContainer);
    }

    const colors = {
        success: 'linear-gradient(135deg, #dc2626, #991b1b)',
        error: 'linear-gradient(135deg, #ef4444, #7f1a1a)',
        warning: 'linear-gradient(135deg, #f59e0b, #b91c1c)',
        info: 'linear-gradient(135deg, #dc2626, #7f1a1a)'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 16px;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        animation: slideIn 0.3s ease;
        cursor: pointer;
        font-size: 14px;
        pointer-events: auto;
        border: 1px solid rgba(255,255,255,0.2);
    `;

    notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;

    notification.onclick = () => notification.remove();
    notificationContainer.appendChild(notification);

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
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100%); }
    }
    .grid-card.selected {
        border: 2px solid #dc2626 !important;
        box-shadow: 0 0 20px rgba(220, 38, 38, 0.5) !important;
    }
    .download-card-btn {
        background: linear-gradient(135deg, #dc2626, #991b1b);
        transition: all 0.3s ease;
    }
    .download-card-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 10px rgba(220, 38, 38, 0.5);
    }
    .floating-button {
        z-index: 10000;
        position: fixed;
        cursor: grab;
        user-select: none;
        pointer-events: auto;
        background: linear-gradient(135deg, #dc2626, #991b1b);
        box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
        transition: all 0.3s ease;
    }
    .floating-button:active {
        cursor: grabbing;
    }
    .floating-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(220, 38, 38, 0.6);
    }
    .floating-button.hidden {
        display: none !important;
    }
    .fullscreen-modal.active {
        display: flex;
        animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    /* Long press indicator */
    .grid-card.long-press {
        transform: scale(0.98);
        transition: transform 0.1s ease;
    }
`;
document.head.appendChild(style);

// ============================================
// FLOATING BUTTONS VISIBILITY CONTROL
// ============================================

function hideFloatingButtons() {
    const downloadBtn = document.getElementById('floating-download-button');
    const helpBtn = document.getElementById('floating-help-button');
    if (downloadBtn) downloadBtn.classList.add('hidden');
    if (helpBtn) helpBtn.classList.add('hidden');
}

function showFloatingButtons() {
    const downloadBtn = document.getElementById('floating-download-button');
    const helpBtn = document.getElementById('floating-help-button');
    if (downloadBtn) downloadBtn.classList.remove('hidden');
    if (helpBtn) helpBtn.classList.remove('hidden');
}

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
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function getCachedImage(imageId) {
    return new Promise((resolve) => {
        if (!db) return resolve(null);
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(imageId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

function saveImageToCache(imageId, imageUrl, blob) {
    if (!db) return Promise.resolve(false);
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id: imageId, url: imageUrl, blob, timestamp: Date.now() });
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
    });
}

async function getCacheStats() {
    if (!db) return { total: 0 };
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        countRequest.onsuccess = () => resolve({ total: countRequest.result });
        countRequest.onerror = () => resolve({ total: 0 });
    });
}

// ============================================
// FAST PARALLEL IMAGE LOADING
// ============================================

async function loadImageWithCache(imageNumber, imageUrl) {
    const imageId = `img_${imageNumber}`;
    const cached = await getCachedImage(imageId);

    if (cached && cached.blob) {
        return { url: URL.createObjectURL(cached.blob), fromCache: true };
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        saveImageToCache(imageId, imageUrl, blob).catch(console.error);
        return { url: blobUrl, fromCache: false };
    } catch {
        return null;
    }
}

async function loadImagesInParallel(startIndex, endIndex, onProgress) {
    const promises = [];
    for (let i = startIndex; i <= endIndex; i++) {
        promises.push(loadImageWithCache(i, `${LOW_QUALITY_FOLDER}/${i}.JPG`));
    }
    const results = await Promise.all(promises);
    for (let i = 0; i < results.length; i++) {
        if (onProgress) onProgress(startIndex + i);
    }
    return results.map((result, idx) => result ? { index: startIndex + idx, ...result } : null).filter(r => r);
}

// ============================================
// DISPLAY PHOTOS WITH LONG PRESS SUPPORT
// ============================================

async function displayPhotos() {
    const grid = document.getElementById('imageGrid');
    if (!grid) return;

    grid.innerHTML = '';
    images = [];

    const loadingBar = document.getElementById('loadingBar');
    const progressBar = document.getElementById('loadingProgress');
    if (loadingBar) {
        loadingBar.style.display = 'block';
        if (progressBar) progressBar.style.width = '0%';
    }

    const cards = [];
    for (let i = 1; i <= TOTAL_IMAGES; i++) {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.animationDelay = `${(i % 20) * 0.02}s`;
        card.innerHTML = `
            <div class="card-image">
                <div class="skeleton"></div>
                <img alt="Photo ${i}" loading="lazy">
                <div class="card-info">
                    <span class="card-date">📅 Photo ${i}</span>
                    <span class="card-name">📷 Image ${i}</span>
                </div>
                <div class="card-overlay">
                    <button class="download-card-btn" onclick="event.stopPropagation(); downloadOriginal(${i})">📥 Download Original</button>
                </div>
            </div>
        `;

        grid.appendChild(card);
        cards.push(card);
        images.push(`${ORIGINAL_FOLDER}/${i}.JPG`);

        // Double-click - manual open (stops auto-play if active)
        card.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearLongPress();
            currentImageIndex = i - 1;
            openModal(images[currentImageIndex], false);
        });

        // Long press for mobile (hold to maximize)
        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            longPressTimer = setTimeout(() => {
                isLongPressing = true;
                card.classList.add('long-press');
                // Vibrate if supported
                if (navigator.vibrate) navigator.vibrate(50);
                currentImageIndex = i - 1;
                openModal(images[currentImageIndex], false);
                clearLongPress();
            }, 500);
        });
        
        card.addEventListener('touchmove', () => {
            clearLongPress();
        });
        
        card.addEventListener('touchend', () => {
            clearLongPress();
        });
        
        // Mouse long press for desktop (hold to maximize)
        card.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            longPressTimer = setTimeout(() => {
                isLongPressing = true;
                card.classList.add('long-press');
                currentImageIndex = i - 1;
                openModal(images[currentImageIndex], false);
                clearLongPress();
            }, 500);
        });
        
        card.addEventListener('mousemove', () => {
            if (longPressTimer) clearLongPress();
        });
        
        card.addEventListener('mouseup', () => {
            clearLongPress();
        });

        // Single click to select/deselect
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-card-btn')) return;
            if (isLongPressing) {
                isLongPressing = false;
                return;
            }
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => card.classList.toggle('selected'), 200);
        });
    }

    const cacheStats = await getCacheStats();
    if (cacheStats.total > 0) {
        showNotification('📦 Cache Ready', `${cacheStats.total} images loaded from cache`, 'success', 2000);
    } else {
        showNotification('📥 First Time Loading', 'Downloading images for faster future visits...', 'info', 3000);
    }

    let loadedCount = 0, cachedCount = 0, networkCount = 0;
    const startTime = Date.now();

    for (let batch = 1; batch <= TOTAL_IMAGES; batch += PARALLEL_LOAD_COUNT) {
        const end = Math.min(batch + PARALLEL_LOAD_COUNT - 1, TOTAL_IMAGES);
        const results = await loadImagesInParallel(batch, end, () => {
            loadedCount++;
            if (progressBar) progressBar.style.width = `${(loadedCount / TOTAL_IMAGES) * 100}%`;
        });

        for (const result of results) {
            const card = cards[result.index - 1];
            const img = card.querySelector('img');
            const skeleton = card.querySelector('.skeleton');
            img.src = result.url;
            img.classList.add('loaded');
            if (skeleton) skeleton.style.display = 'none';
            if (result.fromCache) cachedCount++;
            else networkCount++;
        }

        const statsEl = document.getElementById('stats');
        if (statsEl && !loadingComplete) {
            statsEl.textContent = `📸 ${Math.round((loadedCount / TOTAL_IMAGES) * 100)}% • 💾 ${cachedCount} cached • 🌐 ${networkCount} new`;
        }
    }

    const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    showNotification('✅ Gallery Ready!', `${TOTAL_IMAGES} images loaded in ${loadTime}s • ${cachedCount} from cache`, 'success', 4000);

    loadingComplete = true;
    updateStats();

    setTimeout(() => {
        if (loadingBar) {
            loadingBar.style.opacity = '0';
            setTimeout(() => loadingBar.style.display = 'none', 500);
        }
    }, 1000);
}

function clearLongPress() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    document.querySelectorAll('.grid-card.long-press').forEach(card => {
        card.classList.remove('long-press');
    });
    isLongPressing = false;
}

function updateStats() {
    const statsEl = document.getElementById('stats');
    const imageCountEl = document.getElementById('imageCount');
    if (statsEl) statsEl.textContent = `📸 ${TOTAL_IMAGES} images • Click to select • Hold for fullscreen`;
    if (imageCountEl) imageCountEl.textContent = `${TOTAL_IMAGES} Moments Captured`;
}

// ============================================
// MODAL FUNCTIONS WITH BUTTON HIDE/SHOW
// ============================================

function openModal(imageSrc, fromAutoPlay = false) {
    const modal = document.getElementById('fullscreenModal');
    const modalImg = document.getElementById('fullscreenImage');
    const info = document.getElementById('fullscreenInfo');
    const prevBtn = document.getElementById('fullscreenPrev');
    const nextBtn = document.getElementById('fullscreenNext');
    
    if (!modal || !modalImg) return;

    modal.classList.add('active');
    modalImg.src = imageSrc;
    if (info) info.textContent = `Photo ${currentImageIndex + 1} of ${TOTAL_IMAGES}`;
    
    // Hide floating buttons when modal is open
    hideFloatingButtons();
    
    // Hide navigation buttons during auto-play
    if (fromAutoPlay || isAutoPlaying) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    } else {
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    }
    
    // If manually opened while auto-play is active, stop auto-play without notification
    if (!fromAutoPlay && isAutoPlaying) {
        stopAutoPlay(false);
    }
}

function closeModal(fromAutoPlay = false) {
    const modal = document.getElementById('fullscreenModal');
    const prevBtn = document.getElementById('fullscreenPrev');
    const nextBtn = document.getElementById('fullscreenNext');
    
    if (modal) modal.classList.remove('active');
    
    // Restore floating buttons when modal closes
    showFloatingButtons();
    
    // Restore navigation buttons when closing
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
    
    // Only stop auto-play if closing manually while auto-play is active
    if (!fromAutoPlay && isAutoPlaying) {
        stopAutoPlay(true);
    }
}

function nextImage() {
    if (!isPaused) {
        currentImageIndex = (currentImageIndex + 1) % images.length;
        const modalImg = document.getElementById('fullscreenImage');
        const info = document.getElementById('fullscreenInfo');
        if (modalImg) {
            modalImg.src = images[currentImageIndex];
            if (info) info.textContent = `Photo ${currentImageIndex + 1} of ${TOTAL_IMAGES}`;
        }
    }
}

function prevImage() {
    if (!isPaused) {
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
        const modalImg = document.getElementById('fullscreenImage');
        const info = document.getElementById('fullscreenInfo');
        if (modalImg) {
            modalImg.src = images[currentImageIndex];
            if (info) info.textContent = `Photo ${currentImageIndex + 1} of ${TOTAL_IMAGES}`;
        }
    }
}

// ============================================
// AUTO-PLAY FUNCTIONALITY WITH PAUSE
// ============================================

function initAudio() {
    audio = document.getElementById('bg-music');
    if (audio) {
        audio.loop = true;
        audio.volume = 0.5;
    }
}

function startMusic() {
    if (audio) audio.play().catch(() => {});
}

function stopMusic() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function pauseAutoPlay() {
    if (isAutoPlaying && !isPaused) {
        isPaused = true;
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
        }
        if (audio) audio.pause();
        showNotification('⏸️ Auto-Play Paused', 'Click play to resume slideshow • Press SPACE to resume', 'info', 2000);
        document.getElementById('stats').textContent = '⏸️ AUTO-PLAY PAUSED • Press ▶ or SPACE to resume';
        
        // Show navigation buttons when paused
        const prevBtn = document.getElementById('fullscreenPrev');
        const nextBtn = document.getElementById('fullscreenNext');
        if (prevBtn) prevBtn.style.display = 'flex';
        if (nextBtn) nextBtn.style.display = 'flex';
    }
}

function resumeAutoPlay() {
    if (isAutoPlaying && isPaused) {
        isPaused = false;
        autoPlayInterval = setInterval(nextImage, 4000);
        if (audio) audio.play().catch(() => {});
        showNotification('▶️ Auto-Play Resumed', 'Slideshow continues • Press SPACE to pause', 'success', 2000);
        document.getElementById('stats').textContent = '🎬 AUTO-PLAY ACTIVE • Playing: One Direction - 18';
        
        // Hide navigation buttons when resumed
        const prevBtn = document.getElementById('fullscreenPrev');
        const nextBtn = document.getElementById('fullscreenNext');
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
    }
}

function startAutoPlay() {
    if (autoPlayInterval) clearInterval(autoPlayInterval);
    if (images.length === 0) return;

    isAutoPlaying = true;
    isPaused = false;
    startMusic();
    openModal(images[0], true);
    currentImageIndex = 0;

    autoPlayInterval = setInterval(nextImage, 4000);
    showNotification('🎬 Auto-Play Started', 'Slideshow active • Press SPACE to pause', 'success', 2000);
    document.getElementById('stats').textContent = '🎬 AUTO-PLAY ACTIVE • Playing: One Direction - 18 • Press SPACE to pause';
}

function stopAutoPlay(showNotif = true) {
    const prevBtn = document.getElementById('fullscreenPrev');
    const nextBtn = document.getElementById('fullscreenNext');
    
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    
    const wasAutoPlaying = isAutoPlaying;
    isAutoPlaying = false;
    isPaused = false;
    stopMusic();
    closeModal(true);
    updateStats();
    
    // Restore navigation buttons when auto-play stops
    if (prevBtn) prevBtn.style.display = 'flex';
    if (nextBtn) nextBtn.style.display = 'flex';
    
    if (wasAutoPlaying && showNotif) {
        showNotification('⏹️ Auto-Play Stopped', 'Slideshow has been stopped', 'info', 1500);
    }
}

// ============================================
// DOWNLOAD FUNCTIONS
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

function showDownloadPopup() {
    document.getElementById('popupOverlay').style.display = 'flex';
}

function confirmDownload() {
    const popup = document.getElementById('popupOverlay');
    popup.style.display = 'none';

    const selectedCards = document.querySelectorAll('.grid-card.selected');
    const selectedNumbers = [];
    selectedCards.forEach(card => {
        const match = card.querySelector('.card-date')?.textContent.match(/\d+/);
        if (match) selectedNumbers.push(parseInt(match[0]));
    });

    if (selectedNumbers.length === 0) {
        showNotification('⚠️ No Selection', 'Click on images to select them first', 'warning', 2000);
        return;
    }

    showNotification('📥 Download Started', `Downloading ${selectedNumbers.length} images...`, 'info', 2000);
    selectedNumbers.forEach((num, idx) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `${ORIGINAL_FOLDER}/${num}.JPG`;
            link.download = `KC18_${num}.JPG`;
            link.click();
        }, idx * 200);
    });
}

function cancelDownload() {
    document.getElementById('popupOverlay').style.display = 'none';
}

function downloadAllOriginals() {
    document.querySelectorAll('.grid-card').forEach(card => card.classList.add('selected'));
    showDownloadPopup();
}

function showHelpPopup() {
    document.getElementById('helpPopupOverlay').style.display = 'flex';
}

function closeHelpPopup() {
    document.getElementById('helpPopupOverlay').style.display = 'none';
}

// ============================================
// HEADER IMAGE LOADING
// ============================================

async function loadHeaderImage() {
    const heroImg = document.getElementById('heroImage');
    if (!heroImg) return;

    const result = await loadImageWithCache('header', `${ORIGINAL_FOLDER}/${HEADER_IMAGE_BASE}.JPG`);
    if (result) {
        heroImg.src = result.url;
        heroImg.style.display = 'block';
    } else {
        const fallback = await loadImageWithCache('header_fallback', `${LOW_QUALITY_FOLDER}/${HEADER_IMAGE_BASE}.JPG`);
        if (fallback) {
            heroImg.src = fallback.url;
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
            case 'date-oldest': return numA - numB;
            case 'date-newest': return numB - numA;
            default: return numA - numB;
        }
    });
    cards.forEach(card => grid.appendChild(card));
    showNotification('🔄 Sorted', `Images sorted by ${sortType.replace('-', ' ')}`, 'info', 1000);
}

// ============================================
// CLEAR CACHE FUNCTION
// ============================================

async function clearCache() {
    if (!db) return;
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    showNotification('🗑️ Cache Cleared', 'All cached images have been cleared', 'warning', 2000);
    setTimeout(() => location.reload(), 1000);
}

// ============================================
// FLOATING BUTTONS - DRAGGABLE WITH SNAP
// ============================================

function makeButtonMovable(button, isDraggingFlag) {
    if (!button) return;

    let offsetX, offsetY, hasDragged = false;

    if (!button.style.left && !button.style.right && !button.style.top && !button.style.bottom) {
        button.style.right = '20px';
        button.style.bottom = button.id === 'floating-download-button' ? '20px' : '90px';
    }

    button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hasDragged = false;
        window[isDraggingFlag] = true;

        const rect = button.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        button.style.transition = 'none';
        button.style.cursor = 'grabbing';
        button.style.zIndex = '10001';
        button.style.left = `${rect.left}px`;
        button.style.top = `${rect.top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    });

    window.addEventListener('mousemove', (e) => {
        if (window[isDraggingFlag]) {
            e.preventDefault();

            if (Math.abs(e.clientX - dragStartX) > 5 || Math.abs(e.clientY - dragStartY) > 5) {
                hasDragged = true;
            }

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            newLeft = Math.max(10, Math.min(window.innerWidth - button.offsetWidth - 10, newLeft));
            newTop = Math.max(10, Math.min(window.innerHeight - button.offsetHeight - 10, newTop));

            button.style.left = `${newLeft}px`;
            button.style.top = `${newTop}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (window[isDraggingFlag]) {
            window[isDraggingFlag] = false;
            button.style.transition = 'all 0.3s ease';
            button.style.cursor = 'grab';
            button.style.zIndex = '10000';

            if (hasDragged) {
                snapToLeftOrRightEdge(button);
                setTimeout(() => {
                    fixButtonOverlap(button);
                    hasDragged = false;
                }, 150);
            }
        }
    });

    button.addEventListener('click', (e) => {
        if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            hasDragged = false;
            return;
        }
        if (button.id === 'floating-download-button') {
            showDownloadPopup();
        } else if (button.id === 'floating-help-button') {
            showHelpPopup();
        }
    });
}

function snapToLeftOrRightEdge(button) {
    const rect = button.getBoundingClientRect();
    const margin = 20;
    const windowWidth = window.innerWidth;
    const currentTop = rect.top;
    const distanceToLeft = rect.left;
    const distanceToRight = windowWidth - rect.right;

    if (distanceToLeft <= distanceToRight) {
        button.style.left = `${margin}px`;
        button.style.right = 'auto';
    } else {
        button.style.left = 'auto';
        button.style.right = `${margin}px`;
    }

    button.style.top = `${currentTop}px`;
    button.style.bottom = 'auto';

    const newRect = button.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (newRect.top < margin) {
        button.style.top = `${margin}px`;
    } else if (newRect.bottom > windowHeight - margin) {
        button.style.top = `${windowHeight - button.offsetHeight - margin}px`;
    }

    button.style.transition = 'all 0.3s ease';
}

function fixButtonOverlap(movedButton) {
    const downloadBtn = document.getElementById('floating-download-button');
    const helpBtn = document.getElementById('floating-help-button');

    if (!downloadBtn || !helpBtn) return;

    const btn1Rect = downloadBtn.getBoundingClientRect();
    const btn2Rect = helpBtn.getBoundingClientRect();
    const margin = 20;
    const windowHeight = window.innerHeight;
    const buttonHeight = btn1Rect.height;

    const overlapping = !(btn1Rect.bottom <= btn2Rect.top || btn1Rect.top >= btn2Rect.bottom);

    if (overlapping) {
        const isDownloadAbove = btn1Rect.top < btn2Rect.top;

        if (isDownloadAbove) {
            let newTop1 = btn2Rect.top - buttonHeight - margin;
            let newTop2 = btn2Rect.top;
            newTop1 = Math.max(margin, newTop1);
            newTop2 = Math.min(windowHeight - buttonHeight - margin, newTop2);
            if (newTop1 + buttonHeight + margin > newTop2) {
                newTop1 = newTop2 - buttonHeight - margin;
            }
            downloadBtn.style.top = `${newTop1}px`;
            helpBtn.style.top = `${newTop2}px`;
        } else {
            let newTop2 = btn1Rect.top - buttonHeight - margin;
            let newTop1 = btn1Rect.top;
            newTop2 = Math.max(margin, newTop2);
            newTop1 = Math.min(windowHeight - buttonHeight - margin, newTop1);
            if (newTop2 + buttonHeight + margin > newTop1) {
                newTop2 = newTop1 - buttonHeight - margin;
            }
            helpBtn.style.top = `${newTop2}px`;
            downloadBtn.style.top = `${newTop1}px`;
        }

        const downloadSide = downloadBtn.style.left !== 'auto' ? 'left' : 'right';
        const helpSide = helpBtn.style.left !== 'auto' ? 'left' : 'right';

        if (downloadSide === 'left') {
            downloadBtn.style.left = '20px';
            downloadBtn.style.right = 'auto';
        } else {
            downloadBtn.style.left = 'auto';
            downloadBtn.style.right = '20px';
        }

        if (helpSide === 'left') {
            helpBtn.style.left = '20px';
            helpBtn.style.right = 'auto';
        } else {
            helpBtn.style.left = 'auto';
            helpBtn.style.right = '20px';
        }

        downloadBtn.style.transition = 'all 0.3s ease';
        helpBtn.style.transition = 'all 0.3s ease';
    }
}

function ensureNoOverlap() {
    const downloadBtn = document.getElementById('floating-download-button');
    const helpBtn = document.getElementById('floating-help-button');
    if (!downloadBtn || !helpBtn) return;
    setTimeout(() => {
        const btn1Rect = downloadBtn.getBoundingClientRect();
        const btn2Rect = helpBtn.getBoundingClientRect();
        const overlapping = !(btn1Rect.bottom <= btn2Rect.top || btn1Rect.top >= btn2Rect.bottom);
        if (overlapping) fixButtonOverlap(null);
    }, 50);
}

function initFloatingButtons() {
    const downloadBtn = document.getElementById('floating-download-button');
    const helpBtn = document.getElementById('floating-help-button');
    if (downloadBtn) makeButtonMovable(downloadBtn, 'isDraggingDownloadButton');
    if (helpBtn) makeButtonMovable(helpBtn, 'isDraggingHelpButton');
    setTimeout(() => {
        if (downloadBtn && helpBtn) {
            snapToLeftOrRightEdge(downloadBtn);
            snapToLeftOrRightEdge(helpBtn);
            ensureNoOverlap();
        }
    }, 100);
    window.addEventListener('resize', () => {
        setTimeout(() => {
            if (downloadBtn && helpBtn) {
                snapToLeftOrRightEdge(downloadBtn);
                snapToLeftOrRightEdge(helpBtn);
                ensureNoOverlap();
            }
        }, 100);
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function bindEvents() {
    const modal = document.getElementById('fullscreenModal');
    const closeBtn = document.getElementById('fullscreenClose');
    const prevBtn = document.getElementById('fullscreenPrev');
    const nextBtn = document.getElementById('fullscreenNext');

    if (closeBtn) closeBtn.addEventListener('click', () => {
        if (isAutoPlaying) {
            stopAutoPlay(true);
        } else {
            closeModal(false);
        }
    });
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
        if (!isAutoPlaying) {
            prevImage();
        } else if (isAutoPlaying && !isPaused) {
            pauseAutoPlay();
            prevImage();
        } else {
            prevImage();
        }
    });
    
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (!isAutoPlaying) {
            nextImage();
        } else if (isAutoPlaying && !isPaused) {
            pauseAutoPlay();
            nextImage();
        } else {
            nextImage();
        }
    });

    if (modal) modal.addEventListener('click', (e) => { 
        if (e.target === modal) {
            if (isAutoPlaying) {
                stopAutoPlay(true);
            } else {
                closeModal(false);
            }
        }
    });

    // Keyboard navigation with SPACE for pause/resume
    window.addEventListener('keydown', (e) => {
        const modalEl = document.getElementById('fullscreenModal');
        if (modalEl?.classList.contains('active')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (!isAutoPlaying) {
                    prevImage();
                } else if (isAutoPlaying && !isPaused) {
                    pauseAutoPlay();
                    prevImage();
                } else {
                    prevImage();
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (!isAutoPlaying) {
                    nextImage();
                } else if (isAutoPlaying && !isPaused) {
                    pauseAutoPlay();
                    nextImage();
                } else {
                    nextImage();
                }
            } else if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                if (isAutoPlaying && !isPaused) {
                    pauseAutoPlay();
                } else if (isAutoPlaying && isPaused) {
                    resumeAutoPlay();
                }
            } else if (e.key === 'Escape') {
                if (isAutoPlaying) {
                    stopAutoPlay(true);
                } else {
                    closeModal(false);
                }
            }
        }
    });

    // Mobile swipe gestures with improved detection
    let touchstartX = 0, touchstartY = 0;
    if (modal) {
        modal.addEventListener('touchstart', (e) => { 
            touchstartX = e.changedTouches[0].screenX;
            touchstartY = e.changedTouches[0].screenY;
        });
        modal.addEventListener('touchend', (e) => {
            const diffX = e.changedTouches[0].screenX - touchstartX;
            const diffY = e.changedTouches[0].screenY - touchstartY;
            // Only trigger if horizontal swipe is dominant
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swipe right -> previous
                    if (!isAutoPlaying) {
                        prevImage();
                    } else if (isAutoPlaying && !isPaused) {
                        pauseAutoPlay();
                        prevImage();
                    } else {
                        prevImage();
                    }
                } else {
                    // Swipe left -> next
                    if (!isAutoPlaying) {
                        nextImage();
                    } else if (isAutoPlaying && !isPaused) {
                        pauseAutoPlay();
                        nextImage();
                    } else {
                        nextImage();
                    }
                }
                // Haptic feedback if supported
                if (navigator.vibrate) navigator.vibrate(30);
            }
        });
    }

    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sortType = btn.dataset.sort;
            if (sortType) {
                document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sortImages(sortType);
                if (isAutoPlaying) stopAutoPlay(true);
            }
        });
    });

    // Control buttons
    document.getElementById('autoPlayBtn')?.addEventListener('click', startAutoPlay);
    document.getElementById('downloadAllBtn')?.addEventListener('click', downloadAllOriginals);
    document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    showNotification('🚀 Starting Gallery', 'Loading KC@18 Debut Gallery...', 'info', 1500);

    try { await openDatabase(); } catch (e) { console.error('Cache error:', e); }

    bindEvents();
    await loadHeaderImage();
    await displayPhotos();
    initAudio();
    initFloatingButtons();

    const helpContent = document.querySelector('#helpPopupOverlay .popup-content');
    if (helpContent && !document.getElementById('clearCacheBtn')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearCacheBtn';
        clearBtn.textContent = '🗑️ Clear Cache';
        clearBtn.style.cssText = 'background: #dc2626; color: white; margin-top: 10px; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; width: 100%;';
        clearBtn.onclick = async () => { await clearCache(); closeHelpPopup(); };
        helpContent.appendChild(clearBtn);
    }
}

// Start
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();