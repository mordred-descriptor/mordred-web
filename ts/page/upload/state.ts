export interface UploadState {
    file: File | null;
    gen3D: boolean;
    desalt: boolean;
    error: string | null;

    file_size_limit: number;
}

export const initUpload: UploadState = {
    file: null,
    gen3D: false,
    desalt: true,
    error: null,

    file_size_limit: 0
};
