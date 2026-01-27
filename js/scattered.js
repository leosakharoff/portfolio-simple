/**
 * Scattered Portfolio - Hover Popup & Umbrella Projects
 * Inspired by everynoise.com
 */

document.addEventListener('DOMContentLoaded', () => {
    const scatteredContainer = document.querySelector('.scattered-container');
    const projectWords = document.querySelectorAll('.project-word');
    const umbrellaProjects = document.querySelectorAll('.umbrella-project');
    const popup = document.getElementById('projectPopup');
    const popupImage = document.getElementById('popupImage');
    const popupVideo = document.getElementById('popupVideo');
    const popupTitle = document.getElementById('popupTitle');
    const popupDescription = document.getElementById('popupDescription');
    const popupTech = document.getElementById('popupTech');
    const popupYear = document.getElementById('popupYear');
    const popupLinks = document.getElementById('popupLinks');

    const galleryPrev = document.getElementById('galleryPrev');
    const galleryNext = document.getElementById('galleryNext');
    const popupDots = document.getElementById('popupDots');

    let isPopupVisible = false;
    let currentProject = null;
    let hideTimeout = null;
    let currentExpandedUmbrella = null;
    let isPopupHovered = false;
    let galleryImages = [];
    let currentImageIndex = 0;
    let galleryInterval = null;

    // Image manifest cache
    let projectImagesManifest = null;

    // Fetch image manifest on load
    fetch('js/project-images.json')
        .then(response => response.json())
        .then(data => {
            projectImagesManifest = data;
            console.log('Project images manifest loaded');
        })
        .catch(err => console.error('Failed to load project images manifest:', err));

    // Audio manifest cache and player state
    let projectAudioManifest = null;
    let audioTracks = [];
    let currentTrackIndex = 0;

    // Audio player elements (popup player)
    const audioPlayer = document.getElementById('audioPlayer');
    const audioElement = document.getElementById('audioElement');
    const audioTrackList = document.getElementById('audioTrackList');
    const audioPlayPause = document.getElementById('audioPlayPause');
    const audioPrev = document.getElementById('audioPrev');
    const audioNext = document.getElementById('audioNext');
    const audioProgress = document.getElementById('audioProgress');
    const audioProgressBar = document.getElementById('audioProgressBar');
    const audioCurrentTime = document.getElementById('audioCurrentTime');
    const audioDuration = document.getElementById('audioDuration');

    // Mini audio player elements (global persistent player)
    const miniAudioPlayer = document.getElementById('miniAudioPlayer');
    const miniAudioTrack = document.getElementById('miniAudioTrack');
    const miniAudioPlayPause = document.getElementById('miniAudioPlayPause');
    const miniAudioPrev = document.getElementById('miniAudioPrev');
    const miniAudioNext = document.getElementById('miniAudioNext');
    const miniAudioProgress = document.getElementById('miniAudioProgress');
    const miniAudioProgressBar = document.getElementById('miniAudioProgressBar');
    const miniAudioClose = document.getElementById('miniAudioClose');

    // Volume control elements
    const audioVolumeBtn = document.getElementById('audioVolumeBtn');
    const audioVolume = document.getElementById('audioVolume');
    const audioVolumeBar = document.getElementById('audioVolumeBar');
    const miniAudioVolumeBtn = document.getElementById('miniAudioVolumeBtn');
    const miniAudioVolume = document.getElementById('miniAudioVolume');
    const miniAudioVolumeBar = document.getElementById('miniAudioVolumeBar');

    // Volume state
    const VOLUME_KEY = 'portfolio_audio_volume';
    let savedVolume = parseFloat(localStorage.getItem(VOLUME_KEY)) || 1;
    let isMuted = false;

    // Audio normalization using Web Audio API
    let audioContext = null;
    let sourceNode = null;
    let compressorNode = null;
    let gainNode = null;
    let audioNormalized = false;

    function initAudioNormalization() {
        if (audioNormalized) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context if suspended (required after user interaction)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Create source from audio element
            sourceNode = audioContext.createMediaElementSource(audioElement);

            // Create compressor for normalization/limiting
            compressorNode = audioContext.createDynamicsCompressor();
            compressorNode.threshold.setValueAtTime(-24, audioContext.currentTime); // Start compressing at -24dB
            compressorNode.knee.setValueAtTime(30, audioContext.currentTime); // Soft knee
            compressorNode.ratio.setValueAtTime(12, audioContext.currentTime); // High ratio for limiting
            compressorNode.attack.setValueAtTime(0.003, audioContext.currentTime); // Fast attack
            compressorNode.release.setValueAtTime(0.25, audioContext.currentTime); // Medium release

            // Create gain node for makeup gain
            gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(1.5, audioContext.currentTime); // Boost to compensate for compression

            // Connect: source -> compressor -> gain -> destination
            sourceNode.connect(compressorNode);
            compressorNode.connect(gainNode);
            gainNode.connect(audioContext.destination);

            audioNormalized = true;
            console.log('Audio normalization initialized');
        } catch (err) {
            console.log('Audio normalization not available:', err);
            // If normalization fails, ensure audio still plays normally
            audioNormalized = true; // Prevent retrying
        }
    }

    // Audio state persistence keys
    const AUDIO_STATE_KEY = 'portfolio_audio_state';

    // Save audio state to localStorage
    function saveAudioState() {
        if (!audioElement.src) return;
        const state = {
            src: audioElement.src,
            currentTime: audioElement.currentTime,
            trackName: audioTracks[currentTrackIndex]?.name || 'Unknown',
            tracks: audioTracks,
            trackIndex: currentTrackIndex,
            isPlaying: !audioElement.paused,
            timestamp: Date.now()
        };
        localStorage.setItem(AUDIO_STATE_KEY, JSON.stringify(state));
    }

    // Load audio state from localStorage
    function loadAudioState() {
        const saved = localStorage.getItem(AUDIO_STATE_KEY);
        if (!saved) return null;
        try {
            const state = JSON.parse(saved);
            // Only restore if saved within last 24 hours
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(AUDIO_STATE_KEY);
                return null;
            }
            return state;
        } catch (e) {
            return null;
        }
    }

    // Fetch audio manifest on load and restore/autoplay
    fetch('js/project-audio.json')
        .then(response => response.json())
        .then(data => {
            projectAudioManifest = data;
            console.log('Project audio manifest loaded');

            // Check for saved audio state first
            const savedState = loadAudioState();

            if (savedState && savedState.src) {
                // Restore previous session
                audioTracks = savedState.tracks || [];
                currentTrackIndex = savedState.trackIndex || 0;

                const restoreAudio = () => {
                    audioElement.src = savedState.src;
                    audioElement.currentTime = savedState.currentTime || 0;

                    if (savedState.isPlaying) {
                        audioElement.play().then(() => {
                            miniAudioTrack.textContent = savedState.trackName;
                            miniAudioPlayer.classList.add('visible');
                            miniAudioPlayPause.textContent = '[⏸]';
                        }).catch(err => {
                            console.log('Autoplay blocked, waiting for interaction:', err);
                            // Show mini player anyway so user can click play
                            miniAudioTrack.textContent = savedState.trackName;
                            miniAudioPlayer.classList.add('visible');
                            miniAudioPlayPause.textContent = '[▶]';
                        });
                    } else {
                        // Just load the track but don't play
                        miniAudioTrack.textContent = savedState.trackName;
                        miniAudioPlayer.classList.add('visible');
                        miniAudioPlayPause.textContent = '[▶]';
                    }
                    document.removeEventListener('click', restoreAudio);
                };

                // Try to restore immediately, fall back to user interaction
                restoreAudio();
            } else {
                // No saved state - autoplay Kremnitze on first user interaction
                const autoplayTrack = {
                    name: 'Kremnitze',
                    path: 'https://media.leosakharoff.com/audio/ambient-electroacustic/Kremnitze.wav'
                };

                const startAutoplay = () => {
                    audioTracks = [autoplayTrack];
                    currentTrackIndex = 0;
                    audioElement.src = autoplayTrack.path;
                    audioElement.play().then(() => {
                        miniAudioTrack.textContent = autoplayTrack.name;
                        miniAudioPlayer.classList.add('visible');
                        miniAudioPlayPause.textContent = '[⏸]';
                    }).catch(err => console.log('Autoplay blocked:', err));
                    document.removeEventListener('click', startAutoplay);
                };
                document.addEventListener('click', startAutoplay, { once: true });
            }
        })
        .catch(err => console.error('Failed to load project audio manifest:', err));

    // =====================================================
    // POPUP FUNCTIONALITY
    // =====================================================

    // Position popup near the hovered element
    function positionPopup(element) {
        const rect = element.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        const popupWidth = popupRect.width;
        const popupHeight = popupRect.height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 20;

        let left = rect.right + 20;
        let top = rect.top;

        // If popup would go off right edge, position to the left of element
        if (left + popupWidth + padding > viewportWidth) {
            left = rect.left - popupWidth - 20;
        }

        // If popup still goes off right edge (e.g. forced by logic above or screen too small)
        if (left + popupWidth + padding > viewportWidth) {
            left = viewportWidth - popupWidth - padding;
        }

        // If popup would go off left edge
        if (left < padding) {
            left = padding;
        }

        // If popup would go off bottom, adjust upward
        if (top + popupHeight + padding > viewportHeight) {
            top = viewportHeight - popupHeight - padding;
        }

        // If popup would go off top
        if (top < padding) {
            top = padding;
        }

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }

    // Helper function to check if a media item is a video
    function isVideoFile(path) {
        return /\.(mp4|webm|mov|ogg)$/i.test(path);
    }

    // Show a media item (image or video)
    function showMediaItem(mediaPath, altText, callback) {
        if (isVideoFile(mediaPath)) {
            // Show video, hide image
            popupVideo.src = mediaPath;
            popupVideo.muted = true;
            popupVideo.style.display = 'block';
            popupImage.style.display = 'none';
            // Autoplay muted
            popupVideo.play().catch(err => console.log('Autoplay prevented:', err));
            if (callback) callback();
        } else {
            // Preload image before showing to prevent flash
            const img = new Image();
            img.onload = () => {
                // Hide video
                popupVideo.pause();
                popupVideo.src = '';
                popupVideo.style.display = 'none';
                // Show preloaded image
                popupImage.src = mediaPath;
                popupImage.alt = altText || '';
                popupImage.style.display = 'block';
                if (callback) callback();
            };
            img.onerror = () => {
                // Even on error, try to show it
                popupVideo.pause();
                popupVideo.src = '';
                popupVideo.style.display = 'none';
                popupImage.src = mediaPath;
                popupImage.alt = altText || '';
                popupImage.style.display = 'block';
                if (callback) callback();
            };
            // Start loading
            img.src = mediaPath;
        }
    }

    // Show popup with project data
    function showPopup(element) {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        // Remove popup-active class from previous project
        if (currentProject && currentProject !== element) {
            currentProject.classList.remove('popup-active');
        }

        // Stop any existing gallery interval
        if (galleryInterval) {
            clearInterval(galleryInterval);
            galleryInterval = null;
        }

        // Clear previous media immediately to prevent flash
        popupImage.style.display = 'none';
        popupImage.src = '';
        popupVideo.style.display = 'none';
        popupVideo.pause();
        popupVideo.src = '';

        const title = element.dataset.title;
        const description = element.dataset.description;
        const tech = element.dataset.tech;
        const year = element.dataset.year;
        const link = element.dataset.link;
        const media = element.dataset.media;

        // Use a simpler project ID if available, otherwise try to derive it from link or title
        let projectId = element.dataset.projectId;
        if (!projectId && link) {
            // Try to extract from link (e.g., projects/sound-of-chess.html -> sound-of-chess)
            const match = link.match(/projects\/(.+?)\.html/);
            if (match) projectId = match[1];
        }

        popupTitle.textContent = title;
        popupDescription.textContent = description;
        popupTech.textContent = tech;
        popupYear.textContent = year;

        // Handle links (GitHub, PDF, Instagram, project link)
        const github = element.dataset.github;
        const pdf = element.dataset.pdf;
        const instagram = element.dataset.instagram;

        popupLinks.innerHTML = '';
        if (github || pdf || instagram) {
            const linksHtml = [];
            if (github) {
                linksHtml.push(`<a href="${github}" class="popup-link" target="_blank">GitHub</a>`);
            }
            if (pdf) {
                linksHtml.push(`<a href="${pdf}" class="popup-link" target="_blank" download>Download PDF</a>`);
            }
            if (instagram) {
                linksHtml.push(`<a href="${instagram}" class="popup-link" target="_blank">Instagram</a>`);
            }
            popupLinks.innerHTML = linksHtml.join('');
            popupLinks.style.display = 'flex';
        } else {
            popupLinks.style.display = 'none';
        }

        // Handle media gallery (images and videos together)
        // Get media from manifest if available, otherwise fallback to data-media
        let mediaItems = [];
        if (projectImagesManifest && projectId && projectImagesManifest[projectId]) {
            mediaItems = projectImagesManifest[projectId];
        } else if (media) {
            if (media.includes(',')) {
                mediaItems = media.split(',').map(s => s.trim());
            } else {
                mediaItems = [media];
            }
        }

        if (mediaItems.length > 0) {
            galleryImages = mediaItems;
            currentImageIndex = 0;

            // Show first media item
            showMediaItem(galleryImages[0], title);

            if (galleryImages.length > 1) {
                // Show navigation arrows
                galleryPrev.style.display = 'flex';
                galleryNext.style.display = 'flex';

                // Start slideshow (only for images, not videos)
                startGallerySlideshow();
            } else {
                // Hide navigation arrows
                galleryPrev.style.display = 'none';
                galleryNext.style.display = 'none';
            }
            renderPopupDots();
        } else {
            galleryImages = [];
            popupImage.src = '';
            popupImage.style.display = 'none';
            popupVideo.pause();
            popupVideo.src = '';
            popupVideo.style.display = 'none';
            galleryPrev.style.display = 'none';
            galleryNext.style.display = 'none';
            popupDots.innerHTML = '';
        }

        // Handle audio player
        console.log('Audio check:', { projectId, hasManifest: !!projectAudioManifest, hasTracks: projectAudioManifest ? !!projectAudioManifest[projectId] : false });
        if (projectAudioManifest && projectId && projectAudioManifest[projectId]) {
            // Check if we're switching to a different project's audio
            const newTracks = projectAudioManifest[projectId];
            const isSameProject = audioTracks.length > 0 &&
                audioTracks[0]?.path === newTracks[0]?.path;

            if (!isSameProject) {
                audioTracks = newTracks;
                currentTrackIndex = 0;
            }
            renderAudioTrackList();
            audioPlayer.style.display = 'block';
            // Don't auto-load first track, wait for user to click
        } else {
            // Only hide popup player, don't stop audio (it continues in mini player)
            audioPlayer.style.display = 'none';
        }

        popup.style.visibility = 'hidden';
        popup.classList.add('active');
        positionPopup(element);
        popup.style.visibility = '';
        isPopupVisible = true;
        currentProject = element;
        element.classList.add('popup-active');
    }

    // Hide popup with delay
    function hidePopup() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }
        hideTimeout = setTimeout(() => {
            popup.classList.remove('active');
            isPopupVisible = false;

            // Stop slideshow
            if (galleryInterval) {
                clearInterval(galleryInterval);
                galleryInterval = null;
            }

            // Pause video if playing
            if (popupVideo) {
                popupVideo.pause();
            }

            if (currentProject) {
                currentProject.classList.remove('popup-active');
            }
            currentProject = null;
        }, 200);
    }

    // Gallery functions
    function showImage(index) {
        if (galleryImages.length === 0) return;

        // Ensure index wraps around
        if (index >= galleryImages.length) index = 0;
        if (index < 0) index = galleryImages.length - 1;

        currentImageIndex = index;
        showMediaItem(galleryImages[currentImageIndex], '');
        updatePopupDots();
    }

    function nextImage() {
        showImage(currentImageIndex + 1);
        resetGalleryTimer();
    }

    function prevImage() {
        showImage(currentImageIndex - 1);
        resetGalleryTimer();
    }

    function startGallerySlideshow() {
        if (galleryImages.length <= 1) return;

        // Clear any existing interval
        if (galleryInterval) clearInterval(galleryInterval);

        galleryInterval = setInterval(() => {
            // Only auto-advance if current item is not a video
            if (!isVideoFile(galleryImages[currentImageIndex])) {
                showImage(currentImageIndex + 1);
            }
        }, 3000);
    }

    function resetGalleryTimer() {
        if (galleryImages.length > 1) {
            startGallerySlideshow();
        }
    }

    function renderPopupDots() {
        popupDots.innerHTML = '';
        if (galleryImages.length === 0) return;

        // Even for a single image, we might want to show dots or just hide them.
        // If you want them only for > 1, use if (galleryImages.length <= 1) return;
        // But the previous request asked for dots to show generally.
        // Let's show them always if there are images, or strictly > 1.
        // Consistent with lightbox: show if > 0.

        galleryImages.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'popup-dot';
            dot.ariaLabel = `Go to slide ${index + 1}`;
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                showImage(index);
                resetGalleryTimer();
            });
            popupDots.appendChild(dot);
        });
        updatePopupDots();
    }

    function updatePopupDots() {
        const dots = popupDots.querySelectorAll('.popup-dot');
        dots.forEach((dot, index) => {
            if (index === currentImageIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Gallery event listeners
    galleryPrev.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevImage();
    });

    galleryNext.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextImage();
    });


    // =====================================================
    // UMBRELLA PROJECTS - Circular Expansion
    // =====================================================

    // Position sub-projects scattered around the umbrella with randomness
    function positionSubProjectsInCircle(umbrella) {
        const subProjects = umbrella.querySelectorAll('.sub-project');
        const count = subProjects.length;
        // Calculate dynamic radius based on parent size to prevent overlap
        const rect = umbrella.getBoundingClientRect();
        const parentRadius = Math.max(rect.width, rect.height) / 2;
        // 70px accounts for child approximate half-width + desired margin
        const minDistanceToCenter = parentRadius + 70;

        const radiusVariation = 40;
        const defaultBaseRadius = 150;

        // Ensure that (baseRadius - radiusVariation) >= minDistanceToCenter
        const baseRadius = Math.max(defaultBaseRadius, minDistanceToCenter + radiusVariation);

        const startAngle = -90; // Start from top (in degrees)
        const angleVariation = 25; // Random variation in angle (degrees)

        // Identify obstacles (other project words)
        const obstacles = [];
        document.querySelectorAll('.project-word').forEach(word => {
            if (word !== umbrella) {
                obstacles.push(word.getBoundingClientRect());
            }
        });

        const umbrellaCx = rect.left + rect.width / 2;
        const umbrellaCy = rect.top + rect.height / 2;

        // Track placed sub-projects to avoid overlap between them
        const placedSubProjects = [];

        subProjects.forEach((subProject, index) => {
            // Calculate base angle for this sub-project
            const baseAngle = startAngle + (360 / count) * index;

            // Get dimensions for collision check
            const width = subProject.offsetWidth || 120;
            const height = subProject.offsetHeight || 30;
            const padding = 15; // Extra space around elements

            let bestX, bestY;
            let foundSafePos = false;

            // Try multiple times to find a position without collision
            for (let attempt = 0; attempt < 50; attempt++) {
                // Increase variation slightly with attempts
                const currentAngleVar = angleVariation + (attempt * 2);
                const currentRadiusVar = radiusVariation + (attempt * 2);

                // Add randomness to angle and radius
                const randomAngle = baseAngle + (Math.random() - 0.5) * currentAngleVar * 2;
                const randomRadius = baseRadius + (Math.random() - 0.5) * currentRadiusVar * 2;

                const angleRad = (randomAngle * Math.PI) / 180;

                // Calculate position relative to umbrella center
                const x = Math.cos(angleRad) * randomRadius;
                const y = Math.sin(angleRad) * randomRadius;

                // Calculate absolute bounding box of the sub-project candidate
                const absLeft = umbrellaCx + x - (width / 2) - padding;
                const absTop = umbrellaCy + y - (height / 2) - padding;
                const absRight = absLeft + width + (padding * 2);
                const absBottom = absTop + height + (padding * 2);

                // Check collision with obstacles (other project words)
                let collision = false;
                for (const obs of obstacles) {
                    if (absLeft < obs.right && absRight > obs.left &&
                        absTop < obs.bottom && absBottom > obs.top) {
                        collision = true;
                        break;
                    }
                }

                // Check collision with already placed sub-projects
                if (!collision) {
                    for (const placed of placedSubProjects) {
                        if (absLeft < placed.right && absRight > placed.left &&
                            absTop < placed.bottom && absBottom > placed.top) {
                            collision = true;
                            break;
                        }
                    }
                }

                // Check viewport bounds (keep on screen) if possible
                if (!collision && attempt < 40) {
                     if (absLeft < 0 || absTop < 0 ||
                         absRight > window.innerWidth || absBottom > window.innerHeight) {
                         collision = true;
                     }
                }

                if (!collision) {
                    bestX = x;
                    bestY = y;
                    foundSafePos = true;
                    break;
                }

                // Keep the first attempt as fallback
                if (attempt === 0) {
                    bestX = x;
                    bestY = y;
                }
            }

            // Apply position - use transform to center the text on the point
            subProject.style.left = '0';
            subProject.style.top = '0';
            subProject.style.setProperty('--x', `${bestX}px`);
            subProject.style.setProperty('--y', `${bestY}px`);

            // Add this sub-project's bounding box to placedSubProjects for future collision checks
            const finalAbsLeft = umbrellaCx + bestX - (width / 2) - padding;
            const finalAbsTop = umbrellaCy + bestY - (height / 2) - padding;
            placedSubProjects.push({
                left: finalAbsLeft,
                top: finalAbsTop,
                right: finalAbsLeft + width + (padding * 2),
                bottom: finalAbsTop + height + (padding * 2)
            });
        });
    }

    // Toggle umbrella expansion
    function toggleUmbrella(umbrella) {
        const isCurrentlyExpanded = umbrella.classList.contains('expanded');

        // Collapse any other expanded umbrella first
        if (currentExpandedUmbrella && currentExpandedUmbrella !== umbrella) {
            currentExpandedUmbrella.classList.remove('expanded');
            currentExpandedUmbrella.classList.remove('popup-active');
        }

        if (isCurrentlyExpanded) {
            // Collapse this umbrella
            umbrella.classList.remove('expanded');
            umbrella.classList.remove('popup-active');
            scatteredContainer.classList.remove('has-expanded');
            currentExpandedUmbrella = null;
        } else {
            // Expand this umbrella
            positionSubProjectsInCircle(umbrella);
            umbrella.classList.add('expanded');
            umbrella.classList.add('popup-active');
            scatteredContainer.classList.add('has-expanded');
            currentExpandedUmbrella = umbrella;
        }
    }

    // =====================================================
    // EVENT LISTENERS
    // =====================================================

    // Event listeners for project words
    projectWords.forEach(word => {
        // Click event
        word.addEventListener('click', (e) => {
            if (word.dataset.umbrella === 'true') {
                // Toggle umbrella expansion
                e.stopPropagation();
                toggleUmbrella(word);
            } else {
                // Prevent navigation, optionally toggle popup if desired
                e.preventDefault();
            }
        });

        if (word.dataset.umbrella === 'true') {
            // For umbrella projects, use mouseover/mouseout with target checking
            word.addEventListener('mouseover', (e) => {
                // If an umbrella is expanded (and it's not this one), ignore
                if (currentExpandedUmbrella && currentExpandedUmbrella !== word) {
                    return;
                }
                // Check if hovering directly on umbrella (not on sub-project)
                if (!e.target.closest('.sub-project')) {
                    word.classList.add('direct-hover');
                    showPopup(word);
                }
            });
            word.addEventListener('mouseout', (e) => {
                const relatedTarget = e.relatedTarget;
                // Check if leaving to outside umbrella or to a sub-project
                const goingToSubProject = relatedTarget && relatedTarget.closest('.sub-project');
                const leavingUmbrella = !word.contains(relatedTarget);

                if (goingToSubProject || leavingUmbrella) {
                    word.classList.remove('direct-hover');
                }
                if (leavingUmbrella && !goingToSubProject) {
                    hidePopup();
                } else if (goingToSubProject) {
                    hidePopup();
                }
            });
        } else {
            // For regular projects, use mouseenter/mouseleave
            word.addEventListener('mouseenter', () => {
                // If an umbrella is expanded, do not allow hovering regular projects outside of it
                // Since this is the 'else' block for !umbrella, 'word' is a regular project.
                // If currentExpandedUmbrella is set, we ignore this hover unless this word is somehow part of it (which it isn't, as sub-projects are handled separately).
                if (currentExpandedUmbrella) {
                    return;
                }
                showPopup(word);
            });
            word.addEventListener('mouseleave', () => {
                hidePopup();
            });
        }
    });

    // Event listeners for sub-projects
    document.querySelectorAll('.sub-project').forEach(subProject => {
        subProject.addEventListener('mouseenter', () => {
            showPopup(subProject);
        });

        subProject.addEventListener('mouseleave', () => {
            hidePopup();
        });

        subProject.addEventListener('click', (e) => {
            e.stopPropagation();
            // Navigation removed
        });
    });

    // Keep popup visible when hovering over it
    popup.addEventListener('mouseenter', () => {
        isPopupHovered = true;
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        // Ensure the project stays in hover state
        if (currentProject) {
            currentProject.classList.add('popup-active');
        }
    });

    popup.addEventListener('mouseleave', () => {
        isPopupHovered = false;
        hidePopup();
    });

    // Click outside to collapse expanded umbrella
    document.addEventListener('click', (e) => {
        if (currentExpandedUmbrella) {
            const clickedOnUmbrella = e.target.closest('.umbrella-project');
            const clickedOnSubProject = e.target.closest('.sub-project');
            const clickedOnPopup = e.target.closest('.project-popup');

            if (!clickedOnUmbrella && !clickedOnSubProject && !clickedOnPopup) {
                currentExpandedUmbrella.classList.remove('expanded');
                scatteredContainer.classList.remove('has-expanded');
                currentExpandedUmbrella = null;
            }
        }
    });

    // Keyboard navigation for popup and gallery
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isPopupVisible) {
                popup.classList.remove('active');
                isPopupVisible = false;
                if (currentProject) {
                    currentProject.classList.remove('popup-active');
                }
                currentProject = null;
            }
            if (currentExpandedUmbrella) {
                currentExpandedUmbrella.classList.remove('expanded');
                scatteredContainer.classList.remove('has-expanded');
                currentExpandedUmbrella = null;
            }
        }

        // Space bar for play/pause
        if (e.key === ' ' || e.code === 'Space') {
            // Don't trigger if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            if (audioElement.paused) {
                if (!audioElement.src && audioTracks.length > 0) {
                    loadAndPlayTrack(0);
                } else {
                    audioElement.play();
                }
            } else {
                audioElement.pause();
            }
        }

        // Arrow keys for gallery navigation
        if (isPopupVisible && galleryImages.length > 1) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevImage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextImage();
            }
        }
    });

    // Reposition popup on window resize
    window.addEventListener('resize', () => {
        if (isPopupVisible && currentProject) {
            positionPopup(currentProject);
        }
        // Reposition sub-projects if umbrella is expanded
        if (currentExpandedUmbrella) {
            positionSubProjectsInCircle(currentExpandedUmbrella);
        }
    });

    // =====================================================
    // DECORATIVE ANIMATIONS
    // =====================================================

    // Add subtle floating animation to context words
    const contextWords = document.querySelectorAll('.context-word');
    contextWords.forEach((word) => {
        const duration = 3 + Math.random() * 2;
        const delay = Math.random() * 2;
        word.style.animation = `float ${duration}s ease-in-out ${delay}s infinite`;
    });

    // Add float animation via JS
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes float {
            0%, 100% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-5px);
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Initialize - position sub-projects (they'll be hidden but ready)
    umbrellaProjects.forEach(umbrella => {
        positionSubProjectsInCircle(umbrella);
    });

    // =====================================================
    // AUDIO PLAYER FUNCTIONALITY
    // =====================================================

    function renderAudioTrackList() {
        audioTrackList.innerHTML = '';
        audioTracks.forEach((track, index) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'audio-track' + (index === currentTrackIndex ? ' active' : '');
            trackEl.innerHTML = `
                <span class="audio-track-number">${index + 1}</span>
                <span class="audio-track-name">${track.name}</span>
            `;
            trackEl.addEventListener('click', (e) => {
                e.stopPropagation();
                loadAndPlayTrack(index);
            });
            audioTrackList.appendChild(trackEl);
        });
    }

    function loadAndPlayTrack(index) {
        if (index < 0 || index >= audioTracks.length) return;
        currentTrackIndex = index;
        const track = audioTracks[currentTrackIndex];
        audioElement.src = track.path;
        audioElement.play();
        updateTrackListHighlight();
        audioPlayPause.textContent = '[⏸]';

        // Show and update mini player
        showMiniPlayer(track.name);
    }

    // Mini player functions
    function showMiniPlayer(trackName) {
        if (miniAudioPlayer) {
            miniAudioTrack.textContent = trackName || 'Unknown track';
            miniAudioPlayer.classList.add('visible');
            miniAudioPlayPause.textContent = '[⏸]';
        }
    }

    function hideMiniPlayer() {
        if (miniAudioPlayer) {
            miniAudioPlayer.classList.remove('visible');
        }
    }

    function updateMiniPlayerTrack() {
        if (audioTracks.length > 0 && currentTrackIndex < audioTracks.length) {
            miniAudioTrack.textContent = audioTracks[currentTrackIndex].name;
        }
    }

    function updateTrackListHighlight() {
        const trackEls = audioTrackList.querySelectorAll('.audio-track');
        trackEls.forEach((el, i) => {
            el.classList.toggle('active', i === currentTrackIndex);
        });
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Audio player event listeners
    if (audioPlayPause) {
        audioPlayPause.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioElement.paused) {
                if (!audioElement.src && audioTracks.length > 0) {
                    loadAndPlayTrack(0);
                } else {
                    audioElement.play();
                }
                audioPlayPause.textContent = '[⏸]';
            } else {
                audioElement.pause();
                audioPlayPause.textContent = '[▶]';
            }
        });
    }

    if (audioPrev) {
        audioPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioTracks.length > 0) {
                const newIndex = (currentTrackIndex - 1 + audioTracks.length) % audioTracks.length;
                loadAndPlayTrack(newIndex);
            }
        });
    }

    if (audioNext) {
        audioNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioTracks.length > 0) {
                const newIndex = (currentTrackIndex + 1) % audioTracks.length;
                loadAndPlayTrack(newIndex);
            }
        });
    }

    if (audioElement) {
        let lastSaveTime = 0;
        audioElement.addEventListener('timeupdate', () => {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            audioProgressBar.style.width = `${progress}%`;
            audioCurrentTime.textContent = formatTime(audioElement.currentTime);
            // Update mini player progress bar too
            if (miniAudioProgressBar) {
                miniAudioProgressBar.style.width = `${progress}%`;
            }
            // Save state every 2 seconds to avoid excessive writes
            const now = Date.now();
            if (now - lastSaveTime > 2000) {
                saveAudioState();
                lastSaveTime = now;
            }
        });

        audioElement.addEventListener('loadedmetadata', () => {
            audioDuration.textContent = formatTime(audioElement.duration);
        });

        audioElement.addEventListener('ended', () => {
            // Auto-play next track
            const newIndex = (currentTrackIndex + 1) % audioTracks.length;
            loadAndPlayTrack(newIndex);
        });

        audioElement.addEventListener('pause', () => {
            audioPlayPause.textContent = '[▶]';
            if (miniAudioPlayPause) miniAudioPlayPause.textContent = '[▶]';
            saveAudioState();
        });

        audioElement.addEventListener('play', () => {
            audioPlayPause.textContent = '[⏸]';
            if (miniAudioPlayPause) miniAudioPlayPause.textContent = '[⏸]';
            // Ensure mini player is visible when playing
            if (miniAudioPlayer && audioTracks.length > 0) {
                miniAudioPlayer.classList.add('visible');
                updateMiniPlayerTrack();
            }
            saveAudioState();
            // Audio normalization disabled - causes issues with MediaElementSource
            // initAudioNormalization();
        });
    }

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
        saveAudioState();
    });

    if (audioProgress) {
        audioProgress.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = audioProgress.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audioElement.currentTime = percentage * audioElement.duration;
        });
    }

    // =====================================================
    // MINI AUDIO PLAYER EVENT LISTENERS
    // =====================================================

    if (miniAudioPlayPause) {
        miniAudioPlayPause.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioElement.paused) {
                if (!audioElement.src && audioTracks.length > 0) {
                    loadAndPlayTrack(0);
                } else {
                    audioElement.play();
                }
            } else {
                audioElement.pause();
            }
        });
    }

    if (miniAudioPrev) {
        miniAudioPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioTracks.length > 0) {
                const newIndex = (currentTrackIndex - 1 + audioTracks.length) % audioTracks.length;
                loadAndPlayTrack(newIndex);
            }
        });
    }

    if (miniAudioNext) {
        miniAudioNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (audioTracks.length > 0) {
                const newIndex = (currentTrackIndex + 1) % audioTracks.length;
                loadAndPlayTrack(newIndex);
            }
        });
    }

    if (miniAudioProgress) {
        miniAudioProgress.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = miniAudioProgress.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            audioElement.currentTime = percentage * audioElement.duration;
        });
    }

    if (miniAudioClose) {
        miniAudioClose.addEventListener('click', (e) => {
            e.stopPropagation();
            audioElement.pause();
            audioElement.src = '';
            hideMiniPlayer();
            // Clear saved state when user closes player
            localStorage.removeItem(AUDIO_STATE_KEY);
        });
    }

    // =====================================================
    // VOLUME CONTROL FUNCTIONALITY
    // =====================================================

    function updateVolumeUI(volume) {
        const percentage = volume * 100;
        if (audioVolumeBar) audioVolumeBar.style.width = `${percentage}%`;
        if (miniAudioVolumeBar) miniAudioVolumeBar.style.width = `${percentage}%`;

        // Update mute button icons
        const icon = volume === 0 ? '[○]' : '[♪]';
        if (audioVolumeBtn) audioVolumeBtn.textContent = icon;
        if (miniAudioVolumeBtn) miniAudioVolumeBtn.textContent = icon;

        // Update muted class
        if (audioVolumeBtn) audioVolumeBtn.classList.toggle('muted', volume === 0);
        if (miniAudioVolumeBtn) miniAudioVolumeBtn.classList.toggle('muted', volume === 0);
    }

    function setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        audioElement.volume = volume;
        if (volume > 0) {
            savedVolume = volume;
            isMuted = false;
        }
        localStorage.setItem(VOLUME_KEY, volume.toString());
        updateVolumeUI(volume);
    }

    function toggleMute() {
        if (isMuted || audioElement.volume === 0) {
            // Unmute - restore previous volume
            setVolume(savedVolume > 0 ? savedVolume : 1);
            isMuted = false;
        } else {
            // Mute
            savedVolume = audioElement.volume;
            audioElement.volume = 0;
            isMuted = true;
            updateVolumeUI(0);
        }
    }

    // Initialize volume from saved state
    audioElement.volume = savedVolume;
    updateVolumeUI(savedVolume);

    // Popup player volume controls
    if (audioVolumeBtn) {
        audioVolumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMute();
        });
    }

    if (audioVolume) {
        audioVolume.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = audioVolume.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            setVolume(percentage);
        });
    }

    // Mini player volume controls
    if (miniAudioVolumeBtn) {
        miniAudioVolumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMute();
        });
    }

    if (miniAudioVolume) {
        miniAudioVolume.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = miniAudioVolume.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            setVolume(percentage);
        });
    }

    // =====================================================
    // CONTACT DROPDOWN
    // =====================================================

    const contactLink = document.querySelector('.contact-link');
    const contactList = document.querySelector('.contact-list');

    if (contactLink && contactList) {
        contactLink.addEventListener('click', (e) => {
            e.stopPropagation();
            contactList.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.contact-dropdown')) {
                contactList.classList.remove('open');
            }
        });
    }

    // =====================================================
    // CATEGORY FILTER - Click legend to highlight category
    // =====================================================

    const legendItems = document.querySelectorAll('.legend-item[data-filter]');
    const allProjects = document.querySelectorAll('.project-word, .sub-project');
    let activeFilter = null;

    legendItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const category = item.dataset.filter;

            // Toggle filter - if clicking the same category, clear filter
            if (activeFilter === category) {
                clearCategoryFilter();
                return;
            }

            // Set new active filter
            activeFilter = category;

            // Update legend item states
            legendItems.forEach(li => {
                if (li.dataset.filter === category) {
                    li.classList.add('active');
                    li.classList.remove('dimmed');
                } else {
                    li.classList.remove('active');
                    li.classList.add('dimmed');
                }
            });

            // Update project states
            allProjects.forEach(project => {
                const projectCategory = project.dataset.category;
                if (projectCategory === category) {
                    project.classList.add('category-highlighted');
                    project.classList.remove('category-dimmed');
                } else {
                    project.classList.remove('category-highlighted');
                    project.classList.add('category-dimmed');
                }
            });
        });
    });

    function clearCategoryFilter() {
        activeFilter = null;

        // Reset legend items
        legendItems.forEach(li => {
            li.classList.remove('active', 'dimmed');
        });

        // Reset projects
        allProjects.forEach(project => {
            project.classList.remove('category-highlighted', 'category-dimmed');
        });
    }

    // Clear filter when clicking outside legend
    document.addEventListener('click', (e) => {
        if (activeFilter && !e.target.closest('.category-legend')) {
            // Only clear if not clicking on a project
            if (!e.target.closest('.project-word') && !e.target.closest('.sub-project')) {
                clearCategoryFilter();
            }
        }
    });
});
