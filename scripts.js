// ============================================
// KC@18 GALLERY - Red & Black Theme
// ============================================

// Configuration
const LOW_QUALITY_FOLDER = 'KCat18_LQ';
const ORIGINAL_FOLDER = 'KCat18';
const HEADER_IMAGE_BASE = '72';
const TOTAL_IMAGES = 203;

// Global state
let images = [];
let currentImageIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let audio = null;
let clickTimeout = null;

// ============================================
// DISPLAY PHOTOS
// ============================================

function displayPhotos() {
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
    }
    
    let loadedCount = 0;
    
    for (let i = 1; i <= TOTAL_IMAGES; i++) {
        const card = document.createElement("div");
        card.classList.add("grid-card");
        card.style.animationDelay = `${(i % 20) * 0.02}s`;
        
        const imageUrl = `${LOW_QUALITY_FOLDER}/${i}.JPG`;
        
        card.innerHTML = `
            <div class="card-image">
                <div class="skeleton"></div>
                <img data-src="${imageUrl}" alt="Photo ${i}" loading="lazy">
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
        images.push(`${ORIGINAL_FOLDER}/${i}.JPG`);
        
        // Lazy load images
        const img = card.querySelector('img');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const skeleton = card.querySelector('.skeleton');
                    const image = new Image();
                    image.onload = () => {
                        img.src = imageUrl;
                        img.classList.add('loaded');
                        if (skeleton) skeleton.style.display = 'none';
                        loadedCount++;
                        if (progressBar) {
                            progressBar.style.width = `${(loadedCount / TOTAL_IMAGES) * 100}%`;
                        }
                    };
                    image.onerror = () => {
                        if (skeleton) skeleton.style.display = 'none';
                        loadedCount++;
                        if (progressBar) {
                            progressBar.style.width = `${(loadedCount / TOTAL_IMAGES) * 100}%`;
                        }
                    };
                    image.src = imageUrl;
                    observer.disconnect();
                }
            });
        }, { rootMargin: '100px' });
        
        observer.observe(img);
        
        // Double click to open modal
        card.addEventListener("dblclick", function (e) {
            e.preventDefault();
            e.stopPropagation();
            currentImageIndex = i - 1;
            openModal(images[currentImageIndex]);
        });
        
        // Single click to select/deselect
        card.addEventListener("click", function (e) {
            if (e.target.classList.contains('download-card-btn')) return;
            clearTimeout(clickTimeout);
            clickTimeout = setTimeout(() => {
                card.classList.toggle("selected");
            }, 200);
        });
    }
    
    updateStats();
    
    // Hide loading bar after all images are loaded or timeout
    setTimeout(() => {
        if (loadingBar) {
            loadingBar.style.opacity = '0';
            setTimeout(() => {
                loadingBar.style.display = 'none';
            }, 500);
        }
    }, 3000);
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
// DOWNLOAD FUNCTIONS
// ============================================

function downloadOriginal(imageNumber) {
    const link = document.createElement('a');
    link.href = `${ORIGINAL_FOLDER}/${imageNumber}.JPG`;
    link.download = `KC18_${imageNumber}.JPG`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showTempMessage(`⬇️ Downloading: Photo ${imageNumber}`);
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
        alert('Please select at least one image to download. Click on images to select them (red border appears).');
        return;
    }
    
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
}

// ============================================
// HEADER IMAGE LOADING
// ============================================

function loadHeaderImage() {
    const heroImg = document.getElementById('heroImage');
    if (!heroImg) return;
    
    heroImg.src = `${ORIGINAL_FOLDER}/${HEADER_IMAGE_BASE}.JPG`;
    heroImg.onerror = () => {
        heroImg.src = `${LOW_QUALITY_FOLDER}/${HEADER_IMAGE_BASE}.JPG`;
        heroImg.onerror = () => {
            heroImg.style.display = 'none';
        };
    };
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

function init() {
    bindEvents();
    loadHeaderImage();
    displayPhotos();
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
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}