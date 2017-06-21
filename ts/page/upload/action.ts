export const CHANGE_GENERATE_3D = "UPLOAD:CHANGE_GENERATE_3D";
export const CHANGE_DESALT = "UPLOAD:CHANGE_DESALT";

export interface ChangeGenerate3D {
    type: typeof CHANGE_GENERATE_3D;
    enabled: boolean;
    store: boolean;
}

export function ChangeGenerate3D(p: {enabled: boolean, store: boolean}): ChangeGenerate3D {
    return {type: CHANGE_GENERATE_3D, ...p};
}

export interface ChangeDesalt {
    type: typeof CHANGE_DESALT;
    enabled: boolean;
    store: boolean;
}

export function ChangeDesalt(p: {enabled: boolean, store: boolean}): ChangeDesalt {
    return {type: CHANGE_DESALT, ...p};
}

export const SET_FILE = "UPLOAD:SET_FILE";

export interface SetFile {
    type: typeof SET_FILE;
    file: File|null;
}

export function SetFile(file: SetFile["file"]): SetFile {
    return {type: SET_FILE, file};
}

export const UPLOADED = "UPLOAD:UPLOADED";

export interface Uploaded {
    type: typeof UPLOADED;
    id: string;
}

export function Uploaded(id: string): Uploaded {
    return {type: UPLOADED, id};
}

export const SET_ERROR = "UPLOAD:SET_ERROR";

export interface SetError {
    type: typeof SET_ERROR;
    error: string|null;
}

export function SetError(error: string|null): SetError {
    return {type: SET_ERROR, error};
}

export type UploadAction
    = ChangeGenerate3D
    | ChangeDesalt
    | SetFile
    | Uploaded
    | SetError;

export function isUploadAction(act: {type: string}): act is UploadAction {
    return /^UPLOAD:/.test(act.type);
}
