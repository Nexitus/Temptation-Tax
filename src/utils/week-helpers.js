/**
 * Returns ISO Week ID like "2026-W10"
 */
export function getCurrentWeekId() {
    return getWeekIdForOffset(0);
}

/**
 * Returns the week ID for a given offset from the current week.
 * offset=0 → current week, offset=-1 → last week, etc.
 */
export function getWeekIdForOffset(offset = 0) {
    const date = new Date();
    date.setDate(date.getDate() + (offset * 7));
    const oneJan = new Date(date.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((date.getDay() + 1 + numberOfDays) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Returns the Monday-Sunday date range for the current week.
 */
export function getWeekRangeDisplay() {
    return getWeekRangeDisplayForOffset(0);
}

/**
 * Returns the Monday-Sunday date range for a given week offset.
 */
export function getWeekRangeDisplayForOffset(offset = 0) {
    const now = new Date();
    now.setDate(now.getDate() + (offset * 7));
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString(undefined, options)} – ${sunday.toLocaleDateString(undefined, options)}`;
}

/**
 * Returns a human-readable label for the week offset.
 */
export function getWeekLabel(offset) {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    return `${Math.abs(offset)} Weeks Ago`;
}

const _formatters = {};
export function formatCurrency(amount, currency = 'USD') {
    if (!_formatters[currency]) {
        _formatters[currency] = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    }
    return _formatters[currency].format(amount);
}
