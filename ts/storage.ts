const ls = window.localStorage;

function makeStore<T>(key: string): (value: T) => void {
    return (value: T) => {
        ls.setItem(key, JSON.stringify(value));
    };
}

function makeLoad<T>(key: string, def: () => T): () => T {
    return () => {
        const r = ls.getItem(key);
        if (r === null) {
            return def();
        }
        return JSON.parse(r);
    };
}

const DESCRIPTORS_DISABLED = "descriptors.disabled";
export const storeDisabledDescriptors = makeStore<string[]>(DESCRIPTORS_DISABLED);
export const loadDisabledDescriptors = makeLoad<string[]>(DESCRIPTORS_DISABLED, () => []);

const GENERATE_3D = "upload.generate3D";
export const storeGenerate3D = makeStore<boolean>(GENERATE_3D);
export const loadGenerate3D = makeLoad<boolean>(GENERATE_3D, () => false);

const DESALT = "upload.desalt";
export const storeDesalt = makeStore<boolean>(DESALT);
export const loadDesalt = makeLoad<boolean>(DESALT, () => true);
