// Ripple effect on click
document.addEventListener('click', function(e) {
    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'ripple';

    // Position at click coordinates
    ripple.style.left = e.clientX + 'px';
    ripple.style.top = e.clientY + 'px';

    // Add to body
    document.body.appendChild(ripple);

    // Remove after animation completes
    setTimeout(() => {
        ripple.remove();
    }, 1000);
});
