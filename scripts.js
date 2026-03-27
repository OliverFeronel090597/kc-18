// ============================================
// KC@18 GALLERY - Numbered Images Version
// Compatible with GitHub Pages
// ============================================

// ============================================
// CONFIGURATION - Using Numbered Images
// ============================================
const LOW_QUALITY_FOLDER = 'KCat18_LQ';
const ORIGINAL_FOLDER = 'KCat18';
const HEADER_FOLDER = 'header'
const HEADER_IMAGE_BASE = '_DSC0226'; // Change this to your header image number (e.g., '1', '22', etc.)
const MUSIC_FILE = 'music/One Direction - 18 (Lyrics) (1).mp3';

// Numbered images configuration
const USE_NUMBERED_IMAGES = true;
const TOTAL_NUMBERED_IMAGES = 203; // Change this to match your actual number of images

// Generate image names automatically (1, 2, 3, etc.)
const baseImageNames = Array.from({length: TOTAL_NUMBERED_IMAGES}, (_, i) => String(i + 1));

// Supported extensions - will try in this order
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Global state
let images = [];
let currentIndex = 0;
let autoPlayInterval = null;
let isAutoPlaying = false;
let currentSort = 'date-oldest';
let audio = null;
let loadedImagesCount = 0;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getImageNumber(filename) {
    // For numbered images, extract number from filename (e.g., "123.jpg" -> 123)
    const match = filename.match(/(\d+)\./);
    return match ? parseInt(match[1]) : 0;
}

function getDisplayDate(filename) {
    const num = getImageNumber(filename);
    return `Photo ${num}`;
}

// Check if image exists (promise-based)
function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Find valid path for a base name in a folder
async function findImagePath(baseName, folder) {
    for (const ext of SUPPORTED_EXTENSIONS) {
        const filename = `${baseName}${ext}`;
        const url = `${folder}/${filename}`;
        const exists = await imageExists(url);
        if (exists) {
            return { url, ext, filename };
        }
    }
    return null;
}

// Get all valid image paths from the list
async function getAllImagePaths() {
    const imagePaths = [];
    const statsEl = document.getElementById('stats');

    for (let i = 0; i < baseImageNames.length; i++) {
        const baseName = baseImageNames[i];
        const result = await findImagePath(baseName, LOW_QUALITY_FOLDER);

        if (result) {
            const fileName = result.filename;
            const imageNum = getImageNumber(fileName);
            imagePaths.push({
                name: fileName,
                timestamp: imageNum,
                displayDate: getDisplayDate(fileName),
                lqPath: `${LOW_QUALITY_FOLDER}/${fileName}`,
                originalPath: `${ORIGINAL_FOLDER}/${fileName}`
            });
        }

        // Update scanning progress every 10 images
        if (i % 10 === 0 || i === baseImageNames.length - 1) {
            if (statsEl) statsEl.textContent = `Scanning: ${imagePaths.length}/${baseImageNames.length} images found...`;
        }
    }

    console.log(`✅ Total valid images found: ${imagePaths.length}`);
    return imagePaths;
}

// Sort images based on current sort mode
function sortImages(imagesArray) {
    const sorted = [...imagesArray];
    switch (currentSort) {
        case 'date-oldest':
            sorted.sort((a, b) => a.timestamp - b.timestamp);
            break;
        case 'date-newest':
            sorted.sort((a, b) => b.timestamp - a.timestamp);
            break;
        case 'name-asc':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            sorted.sort((a, b) => b.name.localeCompare(a.name));
            break;
    }
    return sorted;
}

function getSortLabel() {
    const labels = {
        'date-oldest': 'Oldest First',
        'date-newest': 'Newest First',
        'name-asc': 'A-Z',
        'name-desc': 'Z-A'
    };
    return labels[currentSort] || 'Oldest First';
}

// Show temporary status message
function showTempMessage(message, duration = 2000) {
    const statsEl = document.getElementById('stats');
    if (!statsEl) return;
    const original = statsEl.textContent;
    statsEl.textContent = message;
    setTimeout(() => {
        if (statsEl.textContent === message) {
            statsEl.textContent = original;
        }
    }, duration);
}

// ============================================
// IMAGE GALLERY RENDERING
// ============================================

function lazyLoadImage(imgElement, src, card) {
    const skeleton = card.querySelector('.skeleton');
    const image = new Image();

    image.onload = () => {
        imgElement.src = src;
        imgElement.classList.add('loaded');
        if (skeleton) skeleton.style.display = 'none';

        loadedImagesCount++;
        const progress = (loadedImagesCount / images.length) * 100;
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) progressBar.style.width = `${progress}%`;

        if (loadedImagesCount === images.length) {
            const loadingBar = document.getElementById('loadingBar');
            if (loadingBar) {
                loadingBar.style.opacity = '0';
                setTimeout(() => {
                    loadingBar.style.display = 'none';
                }, 500);
            }
        }
    };

    image.onerror = () => {
        if (skeleton) skeleton.style.display = 'none';
        imgElement.classList.add('loaded');
        loadedImagesCount++;
    };

    image.src = src;
}

function displayImages(imagesArray) {
    const grid = document.getElementById('imageGrid');
    if (!grid) return;

    grid.innerHTML = '';
    loadedImagesCount = 0;

    const loadingBar = document.getElementById('loadingBar');
    if (loadingBar) {
        loadingBar.style.display = 'block';
        loadingBar.style.opacity = '1';
    }
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) progressBar.style.width = '0%';

    if (imagesArray.length === 0) {
        grid.innerHTML = '<div class="loading-state"><p>⚠️ No images found. Please check folder structure.</p><p style="font-size: 0.8rem; margin-top: 1rem;">Expected folders: KCat18_LQ/ and KCat18/ with numbered JPG/PNG images (1.jpg, 2.jpg, etc.)</p></div>';
        const statsEl = document.getElementById('stats');
        if (statsEl) statsEl.textContent = 'No images found';
        return;
    }

    imagesArray.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.animationDelay = `${index * 0.02}s`;
        card.onclick = () => openFullscreen(index);

        const imageUrl = image.lqPath;

        card.innerHTML = `
            <div class="card-image">
                <div class="skeleton"></div>
                <img data-src="${imageUrl}" alt="Photo ${image.timestamp}" loading="lazy">
                <div class="card-info">
                    <span class="card-date">📅 ${image.displayDate}</span>
                    <span class="card-name">📷 Photo ${image.timestamp}</span>
                </div>
                <div class="card-overlay">
                    <button class="download-card-btn" onclick="event.stopPropagation(); window.downloadOriginal('${image.name}')">
                        📥 Download Original
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);

        const img = card.querySelector('img');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lazyLoadImage(img, imageUrl, card);
                    observer.disconnect();
                }
            });
        }, { rootMargin: '100px' });

        observer.observe(img);
    });

    const statsEl = document.getElementById('stats');
    if (statsEl) statsEl.textContent = `📸 ${imagesArray.length} images • ${getSortLabel()}`;
    const imageCountEl = document.getElementById('imageCount');
    if (imageCountEl) imageCountEl.textContent = `${imagesArray.length} Moments Captured`;
}

// ============================================
// HEADER IMAGE LOADING
// ============================================

async function loadHeaderImage() {
    const heroImg = document.getElementById('heroImage');
    if (!heroImg) return;

    // Try to find header image in original folder first, then LQ
    let result = await findImagePath(HEADER_IMAGE_BASE, HEADER_FOLDER);
    // if (!result) {
    //     result = await findImagePath(HEADER_IMAGE_BASE, LOW_QUALITY_FOLDER);
    // }

    if (result && result.url) {
        heroImg.src = result.url;
        heroImg.style.display = 'block';
    } else {
        console.warn('Header image not found, using fallback');
        heroImg.style.display = 'none';
    }
}

// ============================================
// DOWNLOAD FUNCTIONS
// ============================================

window.downloadOriginal = function (imageName) {
    const link = document.createElement('a');
    link.href = `${ORIGINAL_FOLDER}/${imageName}`;
    link.download = `KC18_${imageName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showTempMessage(`⬇️ Downloading: Photo ${getImageNumber(imageName)}`);
};

function downloadAllOriginals() {
    if (images.length === 0) return;
    let downloaded = 0;
    images.forEach((image, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = image.originalPath;
            link.download = `KC18_${image.name}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            downloaded++;
            const statsEl = document.getElementById('stats');
            if (statsEl) statsEl.textContent = `Downloading: ${downloaded}/${images.length}`;
            if (downloaded === images.length) {
                setTimeout(() => {
                    if (statsEl) statsEl.textContent = `✅ Downloaded all ${images.length} originals`;
                    setTimeout(() => {
                        if (statsEl && images.length) statsEl.textContent = `📸 ${images.length} images • ${getSortLabel()}`;
                    }, 2000);
                }, 500);
            }
        }, index * 250);
    });
}

// ============================================
// FULLSCREEN & AUTO-PLAY
// ============================================

function openFullscreen(index) {
    if (!images.length) return;
    currentIndex = index;
    const modal = document.getElementById('fullscreenModal');
    const img = document.getElementById('fullscreenImage');
    const info = document.getElementById('fullscreenInfo');
    if (img && info && images[currentIndex]) {
        img.src = images[currentIndex].lqPath;
        info.textContent = `${images[currentIndex].displayDate} | Photo ${images[currentIndex].timestamp}`;
    }
    if (modal) modal.classList.add('active');
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    if (modal) modal.classList.remove('active');
}

function nextFullscreen() {
    if (!images.length) return;
    currentIndex = (currentIndex + 1) % images.length;
    const img = document.getElementById('fullscreenImage');
    const info = document.getElementById('fullscreenInfo');
    if (img && info && images[currentIndex]) {
        img.src = images[currentIndex].lqPath;
        info.textContent = `${images[currentIndex].displayDate} | Photo ${images[currentIndex].timestamp}`;
    }
}

function prevFullscreen() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    const img = document.getElementById('fullscreenImage');
    const info = document.getElementById('fullscreenInfo');
    if (img && info && images[currentIndex]) {
        img.src = images[currentIndex].lqPath;
        info.textContent = `${images[currentIndex].displayDate} | Photo ${images[currentIndex].timestamp}`;
    }
}

// Audio functions
function initAudio() {
    try {
        audio = new Audio(MUSIC_FILE);
        audio.loop = true;
        audio.volume = 0.5;
    } catch (e) {
        console.log('Audio init failed:', e);
    }
}

function startMusic() {
    if (!audio) initAudio();
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
    openFullscreen(0);
    autoPlayInterval = setInterval(() => {
        nextFullscreen();
    }, 4000);

    const statsEl = document.getElementById('stats');
    if (statsEl) statsEl.textContent = `🎬 AUTO-PLAY ACTIVE • Playing: One Direction - 18 • Press ✕ to stop`;
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    isAutoPlaying = false;
    stopMusic();
    closeFullscreen();
    const statsEl = document.getElementById('stats');
    if (statsEl && images.length) statsEl.textContent = `📸 ${images.length} images • ${getSortLabel()}`;
}

// ============================================
// REFRESH GALLERY (MAIN LOADER)
// ============================================

async function refreshGallery() {
    const grid = document.getElementById('imageGrid');
    if (grid) {
        grid.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Scanning for images in KCat18_LQ/ folder...</p></div>';
    }
    const imageObjects = await getAllImagePaths();
    const sorted = sortImages(imageObjects);
    images = sorted;
    displayImages(images);
}

// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

function bindEvents() {
    const autoPlayBtn = document.getElementById('autoPlayBtn');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const fullscreenClose = document.getElementById('fullscreenClose');
    const fullscreenPrev = document.getElementById('fullscreenPrev');
    const fullscreenNext = document.getElementById('fullscreenNext');

    if (autoPlayBtn) autoPlayBtn.addEventListener('click', startAutoPlay);
    if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllOriginals);
    if (refreshBtn) refreshBtn.addEventListener('click', refreshGallery);
    if (fullscreenClose) fullscreenClose.addEventListener('click', stopAutoPlay);
    if (fullscreenPrev) fullscreenPrev.addEventListener('click', () => {
        prevFullscreen();
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => nextFullscreen(), 4000);
        }
    });
    if (fullscreenNext) fullscreenNext.addEventListener('click', () => {
        nextFullscreen();
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = setInterval(() => nextFullscreen(), 4000);
        }
    });

    const sortBtns = document.querySelectorAll('.sort-btn');
    sortBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sortType = btn.getAttribute('data-sort');
            if (sortType) {
                currentSort = sortType;
                sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (images.length > 0) {
                    const sorted = sortImages(images);
                    images = sorted;
                    displayImages(images);
                    if (isAutoPlaying) stopAutoPlay();
                }
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('fullscreenModal');
        if (modal && modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') prevFullscreen();
            if (e.key === 'ArrowRight') nextFullscreen();
            if (e.key === 'Escape') stopAutoPlay();
        }
    });
}

// Start everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function init() {
    bindEvents();
    await loadHeaderImage();
    await refreshGallery();
    initAudio();
}