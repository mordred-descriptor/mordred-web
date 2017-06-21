import {FileInfoResult} from "../../api";

export interface FileState {
    id: string|null;
    done: boolean;
    total: number;
    current: number;
    name: string;
    downloadShown: boolean;
    modalShown: boolean;
    descriptors: string[]|null;
    disabled: {[key: string]: boolean};
    notFound: boolean;
    file_errors: string[];
    is3D: boolean;
    desalt: boolean;
    gen3D: boolean;
    mols: Array<{name: string; forcefield: string, mol?: Blob|null}>;
}

export const initFile: FileState = {
    id: null,
    done: false,
    total: 0,
    current: 0,
    name: "",
    downloadShown: false,
    modalShown: false,
    descriptors: [],
    disabled: {},
    notFound: false,

    file_errors: [],
    is3D: false,
    desalt: false,
    gen3D: false,
    mols: [],
};
