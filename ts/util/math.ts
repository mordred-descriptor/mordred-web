function _log10(x: number): number {
    return Math.log(x) / Math.LN10;
}

export const log10 = (Math as any).log10 || _log10;

export function numberOfDigit(n: number) {
    const a = Math.abs(n);
    if (a === 0) {
        return 1;
    }

    return Math.floor(log10(a)) + 1;
}

export function splitNumAndExp(n: number, expDigit: number = 2): [number, number] {
    const d = numberOfDigit(n);
    if (d > expDigit || d < (-expDigit + 2)) {
        const p = Math.pow(10, d - 1);
        return [n / p, d - 1];
    }

    return [n, 0];
}
