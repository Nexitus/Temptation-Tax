

/**
 * Calculates compound interest on a series of weekly deposits.
 * Compounded weekly.
 */
export function calculateCompoundInterest(deposits, annualRate) {
    if (!deposits || deposits.length === 0) return 0;

    const now = new Date();
    let totalInterest = 0;

    deposits.forEach(deposit => {
        const depositRate = deposit.interestRate !== undefined ? deposit.interestRate : annualRate;
        const weeklyRate = depositRate / 52;

        const depositDate = new Date(deposit.confirmedAt);
        const diffTime = Math.max(0, now - depositDate);
        const weeksElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

        if (weeksElapsed > 0) {
            // Compound Interest Formula: A = P(1 + r/n)^nt
            // Here n=52, nt = weeksElapsed
            const futureValue = deposit.amount * Math.pow(1 + weeklyRate, weeksElapsed);
            totalInterest += (futureValue - deposit.amount);
        }
    });

    return totalInterest;
}
