/**
 * Animate a numeric value from start to end
 * @param {HTMLElement} element - The element to update
 * @param {number} start - Beginning value
 * @param {number} end - Final value
 * @param {number} duration - Animation duration in ms
 * @param {function} formatFn - Optional formatting function
 */
export function animateNumber(element, start, end, duration = 800, formatFn = (v) => v.toFixed(2)) {
    if (!element) return;
    
    // Add shimmer class during animation
    element.classList.add('number-update');
    
    let startTime = null;

    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        // Use easeOutExpo for the counter
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        
        const currentValue = start + (end - start) * easeProgress;
        element.textContent = formatFn(currentValue);

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.classList.remove('number-update');
        }
    }

    window.requestAnimationFrame(step);
}
