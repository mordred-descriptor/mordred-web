export interface UploadState {
    file: File|null;
    gen3D: boolean;
    desalt: boolean;
    error: string|null;
}

export const initUpload: UploadState =  {
    file: null,
    gen3D: false,
    desalt: true,
    error: null,
};
