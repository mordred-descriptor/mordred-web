export default function deleteIndex<T>(a: T[], i: number): T[] {
    return a.slice(0, i).concat(a.slice(i + 1));
}
