// Simple lightbox for gallery images
class Lightbox {
    constructor() {
        this.currentIndex = 0;
        this.items = [];
        this.lightboxEl = null;
        this.init();
    }

    init() {
        // Create lightbox element
        this.lightboxEl = document.createElement('div');
        this.lightboxEl.className = 'lightbox';
        this.lightboxEl.innerHTML = `
            <button class="lightbox-close">&times;</button>
            <button class="lightbox-nav lightbox-prev">&lsaquo;</button>
            <button class="lightbox-nav lightbox-next">&rsaquo;</button>
        `;
        document.body.appendChild(this.lightboxEl);

        // Get all gallery items
        const galleryItems = document.querySelectorAll('.gallery-item');
        galleryItems.forEach((item, index) => {
            const img = item.querySelector('img');
            const video = item.querySelector('video');

            if (img) {
                this.items.push({ type: 'image', src: img.src, alt: img.alt });
                item.addEventListener('click', () => this.open(index));
            } else if (video) {
                this.items.push({ type: 'video', src: video.src });
                item.addEventListener('click', () => this.open(index));
            }
        });

        // Event listeners
        this.lightboxEl.addEventListener('click', (e) => {
            if (e.target === this.lightboxEl || e.target.className === 'lightbox-close') {
                this.close();
            }
        });

        const prevBtn = this.lightboxEl.querySelector('.lightbox-prev');
        const nextBtn = this.lightboxEl.querySelector('.lightbox-next');

        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.prev();
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.next();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightboxEl.classList.contains('active')) return;

            if (e.key === 'Escape') this.close();
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
    }

    open(index) {
        this.currentIndex = index;
        this.show();
        this.lightboxEl.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.lightboxEl.classList.remove('active');
        document.body.style.overflow = '';

        // Remove current media
        const media = this.lightboxEl.querySelector('img, video');
        if (media && media.parentElement === this.lightboxEl) {
            this.lightboxEl.removeChild(media);
        }
    }

    show() {
        // Remove existing media
        const existingMedia = this.lightboxEl.querySelector('img, video');
        if (existingMedia && existingMedia.parentElement === this.lightboxEl) {
            this.lightboxEl.removeChild(existingMedia);
        }

        const item = this.items[this.currentIndex];
        let mediaEl;

        if (item.type === 'image') {
            mediaEl = document.createElement('img');
            mediaEl.src = item.src;
            mediaEl.alt = item.alt || '';
        } else if (item.type === 'video') {
            mediaEl = document.createElement('video');
            mediaEl.src = item.src;
            mediaEl.controls = true;
            mediaEl.autoplay = true;
        }

        // Insert before the close button
        this.lightboxEl.insertBefore(mediaEl, this.lightboxEl.firstChild);

        // Show/hide navigation buttons
        const prevBtn = this.lightboxEl.querySelector('.lightbox-prev');
        const nextBtn = this.lightboxEl.querySelector('.lightbox-next');

        prevBtn.style.display = this.items.length > 1 ? 'block' : 'none';
        nextBtn.style.display = this.items.length > 1 ? 'block' : 'none';
    }

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.show();
    }

    prev() {
        this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.show();
    }
}

// Initialize lightbox when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new Lightbox());
} else {
    new Lightbox();
}
