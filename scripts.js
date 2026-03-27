// ============================================
// FIXED CONFIGURATION - Correct folder structure
// ============================================
const LOW_QUALITY_FOLDER = 'KCat18_LQ';
const ORIGINAL_FOLDER = 'KCat18';
const HEADER_IMAGE_BASE = '_DSC0226';
const MUSIC_FILE = 'music/One Direction - 18 (Lyrics) (1).mp3';

// Supported extensions - will try common ones in order
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];

// Complete list of image base names (without extension)
const baseImageNames = [
    '_DSC0031', '_DSC0032', '_DSC0033', '_DSC0034', '_DSC0035',
    '_DSC0036', '_DSC0037', '_DSC0039', '_DSC0044', '_DSC0045',
    '_DSC0052', '_DSC0054', '_DSC0056', '_DSC0057', '_DSC0058',
    '_DSC0059', '_DSC0060', '_DSC0068', '_DSC0069', '_DSC0070',
    '_DSC0071', '_DSC0072', '_DSC0074', '_DSC0075', '_DSC0092',
    '_DSC0093', '_DSC0094', '_DSC0095', '_DSC0096', '_DSC0097',
    '_DSC0098', '_DSC0099', '_DSC0100', '_DSC0101', '_DSC0102',
    '_DSC0103', '_DSC0104', '_DSC0105', '_DSC0106', '_DSC0107',
    '_DSC0108', '_DSC0120', '_DSC0121', '_DSC0122', '_DSC0123',
    '_DSC0124', '_DSC0126', '_DSC0127', '_DSC0128', '_DSC0129',
    '_DSC0130', '_DSC0131', '_DSC0132', '_DSC0133', '_DSC0134',
    '_DSC0135', '_DSC0136', '_DSC0149', '_DSC0150', '_DSC0151',
    '_DSC0173', '_DSC0177', '_DSC0184', '_DSC0185', '_DSC0186',
    '_DSC0189', '_DSC0190', '_DSC0195', '_DSC0219', '_DSC0224',
    '_DSC0225', '_DSC0226', '_DSC0229', '_DSC0230', '_DSC0232',
    '_DSC0234', '_DSC0235', '_DSC0241', '_DSC0244', '_DSC0246',
    '_DSC0247', '_DSC0248', '_DSC0260', '_DSC0261', '_DSC0262',
    '_DSC0267', '_DSC0351', '_DSC0352', '_DSC0356', '_DSC0358',
    '_DSC0359', '_DSC0360', '_DSC0361', '_DSC0385', '_DSC0386',
    '_DSC0387', '_DSC0393', '_DSC0394', '_DSC0395', '_DSC0396',
    '_DSC0397', '_DSC0398', '_DSC0424', '_DSC0425', '_DSC0426',
    '_DSC0429', '_DSC0430', '_DSC0439', '_DSC0440', '_DSC0441',
    '_DSC0442', '_DSC0443', '_DSC0444', '_DSC0446', '_DSC0448',
    '_DSC0449', '_DSC0450', '_DSC0454', '_DSC0455', '_DSC0456',
    '_DSC0457', '_DSC0458', '_DSC0495', '_DSC0496', '_DSC0497',
    '_DSC0499', '_DSC0500', '_DSC0501', '_DSC0506', '_DSC0507',
    '_DSC0508', '_DSC0509', '_DSC0510', '_DSC0511', '_DSC0512',
    '_DSC0514', '_DSC0515', '_DSC0516', '_DSC0517', '_DSC0518',
    '_DSC0519', '_DSC0520', '_DSC0521', '_DSC0523', '_DSC0532',
    '_DSC0533', '_DSC0542', '_DSC0545', '_DSC0553', '_DSC0554',
    '_DSC0556', '_DSC0562', '_DSC0563', '_DSC0564', '_DSC0566',
    '_DSC0567', '_DSC0568', '_DSC0588', '_DSC0589', '_DSC0590',
    '_DSC0596', '_DSC0597', '_DSC0598', '_DSC0599', '_DSC0605',
    '_DSC0607', '_DSC0608', '_DSC0617', '_DSC0618', '_DSC0619',
    '_DSC0623', '_DSC0624', '_DSC0625', '_DSC0626', '_DSC0629',
    '_DSC0660', '_DSC0661', '_DSC0662', '_DSC0663', '_DSC0664',
    '_DSC0665', '_DSC0666', '_DSC0667', '_DSC0669', '_DSC0670',
    '_DSC0702', '_DSC0703', '_DSC0704', '_DSC0705', '_DSC0706',
    '_DSC0709', '_DSC0710', '_DSC0711', '_DSC0712', '_DSC0723',
    '_DSC0724', '_DSC0726', '_DSC0727', '_DSC0734', '_DSC0735',
    '_DSC0736', '_DSC0743', '_DSC0747', '_DSC0748', '_DSC0751',
    '_DSC0752'
];

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
    const match = filename.match(/_DSC(\d+)/i);
    if (match) return parseInt(match[1]);
    return 0;
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
        const url = `${folder}/${baseName}${ext}`;
        const exists = await imageExists(url);
        if (exists) {
            return { url, ext };
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
            const fileName = `${baseName}${result.ext}`;
            const imageNum = getImageNumber(fileName);
            imagePaths.push({
                name: fileName,
                timestamp: imageNum,
                displayDate: `IMG-${String(imageNum).slice(-4)}`
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
        grid.innerHTML = '<div class="loading-state"><p>⚠️ No images found. Please check folder structure.</p><p style="font-size: 0.8rem; margin-top: 1rem;">Expected folders: KCat18_LQ/ and KCat18/ with JPG/PNG images</p></div>';
        const statsEl = document.getElementById('stats');
        if (statsEl) statsEl.textContent = 'No images found';
        return;
    }

    imagesArray.forEach((image, index) => {
        const card = document.createElement('div');
        card.className = 'grid-card';
        card.style.animationDelay = `${index * 0.02}s`;
        card.onclick = () => openFullscreen(index);

        const imageUrl = `${LOW_QUALITY_FOLDER}/${image.name}`;

        card.innerHTML = `
            <div class="card-image">
                <div class="skeleton"></div>
                <img data-src="${imageUrl}" alt="${image.name}" loading="lazy">
                <div class="card-info">
                    <span class="card-date">📅 ${image.displayDate}</span>
                    <span class="card-name">📷 ${image.name}</span>
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
// HEADER IMAGE LOADING (FIXED)
// ============================================
async function loadHeaderImage() {
    const heroImg = document.getElementById('heroImage');
    if (!heroImg) return;

    // Try to find header image in original folder first, then LQ
    let result = await findImagePath(HEADER_IMAGE_BASE, ORIGINAL_FOLDER);
    if (!result) {
        result = await findImagePath(HEADER_IMAGE_BASE, LOW_QUALITY_FOLDER);
    }

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
    showTempMessage(`⬇️ Downloading: ${imageName}`);
};

function downloadAllOriginals() {
    if (images.length === 0) return;
    let downloaded = 0;
    images.forEach((image, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `${ORIGINAL_FOLDER}/${image.name}`;
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
        img.src = `${LOW_QUALITY_FOLDER}/${images[currentIndex].name}`;
        info.textContent = `${images[currentIndex].name} | ${images[currentIndex].displayDate}`;
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
        img.src = `${LOW_QUALITY_FOLDER}/${images[currentIndex].name}`;
        info.textContent = `${images[currentIndex].name} | ${images[currentIndex].displayDate}`;
    }
}

function prevFullscreen() {
    if (!images.length) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    const img = document.getElementById('fullscreenImage');
    const info = document.getElementById('fullscreenInfo');
    if (img && info && images[currentIndex]) {
        img.src = `${LOW_QUALITY_FOLDER}/${images[currentIndex].name}`;
        info.textContent = `${images[currentIndex].name} | ${images[currentIndex].displayDate}`;
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