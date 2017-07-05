import { FileInfoResult, Phase, PHASE_PENDING } from "../../api";

export interface Mol {
    name: string;
    forcefield: string | null;
    mol?: Blob | null;
}

export interface FileState {
    id: string | null;
    phase: Phase | null | "not-found";
    name: string;

    total: number;
    progress: number;

    downloadShown: boolean;
    modalShown: boolean;

    descriptors: string[] | null;
    disabled: { [key: string]: boolean };

    file_errors: string[];

    is3D: boolean;
    desalt: boolean;
    gen3D: boolean;

    current: number;
    mols: Array<{ name: string; forcefield?: string; mol?: Blob | null }>;
}

export const initFile: FileState = {
    id: null,
    phase: null,
    total: 0,
    progress: 0,
    name: "",
    downloadShown: false,
    modalShown: false,
    descriptors: [],
    disabled: {},

    file_errors: [],
    is3D: false,
    desalt: false,
    gen3D: false,

    current: 0,
    mols: []
};
