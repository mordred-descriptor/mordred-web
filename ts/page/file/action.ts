import * as api from "../../api";

export const SET_ID = "FILE:SET_ID";

export interface SetID {
    type: typeof SET_ID;
    id: string;
}

export function SetID(id: string): SetID {
    return {type: SET_ID, id};
}

export const UPDATE_STATE = "FILE:UPDATE_STATE";

export interface UpdateState extends api.FileChannelMessagePayload {
    type: typeof UPDATE_STATE;
}

export function UpdateState(s: api.FileChannelMessagePayload): UpdateState {
    return {type: UPDATE_STATE, ...s};
}

export const SET_DOWNLOAD_SHOWN = "FILE:SET_DOWNLOAD_SHOWN";

export interface SetDownloadShown {
    type: typeof SET_DOWNLOAD_SHOWN;
    shown: boolean;
}

export function SetDownloadShown(shown: boolean): SetDownloadShown {
    return {type: SET_DOWNLOAD_SHOWN, shown};
}

export const SET_DESCRIPTORS = "FILE:SET_DESCRIPTORS";

export interface SetDescriptors {
    type: typeof SET_DESCRIPTORS;
    descriptors: string[];
}

export function SetDescriptors(descriptors: string[]): SetDescriptors {
    return {type: SET_DESCRIPTORS, descriptors};
}

export const SET_DESCRIPTOR_ENABLED = "FILE:SET_DESCRIPTOR_ENABLED";

export interface SetDescriptorEnabled {
    type: typeof SET_DESCRIPTOR_ENABLED;
    name: string;
    enabled: boolean;
    store: boolean;
}

export function SetDescriptorEnabled(p: {name: string, enabled: boolean, store: boolean}): SetDescriptorEnabled {
    return {type: SET_DESCRIPTOR_ENABLED, ...p};
}

export const SET_ALL_DESCRIPTORS_ENABLED = "FILE:SET_ALL_DESCRIPTORS_ENABLED";

export interface SetAllDescriptorsEnabled {
    type: typeof SET_ALL_DESCRIPTORS_ENABLED;
    enabled: boolean;
}

export function SetAllDescriptorsEnabled(enabled: boolean): SetAllDescriptorsEnabled {
    return {type: SET_ALL_DESCRIPTORS_ENABLED, enabled};
}

export const SET_MODAL_SHOWN = "FILE:SET_MODAL_SHOWN";

export interface SetModalShown {
    type: typeof SET_MODAL_SHOWN;
    shown: boolean;
}

export function SetModalShown(shown: boolean): SetModalShown {
    return {type: SET_MODAL_SHOWN, shown};
}

export const SET_FILE_INFO = "FILE:SET_FILE_INFO";

export interface SetFileInfo extends api.FileInfoResult {
    type: typeof SET_FILE_INFO;
}

export function SetFileInfo(info: api.FileInfoResult): SetFileInfo {
    return {type: SET_FILE_INFO, ...info};
}

export const CLOSE_ERROR = "FILE:CLOSE_ERROR";

export interface CloseError {
    type: typeof CLOSE_ERROR;
    index: number;
}

export function CloseError(index: number): CloseError {
    return {type: CLOSE_ERROR, index};
}

export const SET_CURRENT_MOL = "FILE:SET_CURRENT_MOL";

export interface SetCurrentMol {
    type: typeof SET_CURRENT_MOL;
    index: number;
}

export function SetCurrentMol(index: number): SetCurrentMol {
    return {type: SET_CURRENT_MOL, index};
}

export const MOL_FETCHED = "FILE:MOL_FETCHED";

export interface MolFetched {
    type: typeof MOL_FETCHED;
    nth: number;
    mol: Blob|null;
}

export function MolFetched(nth: number, mol: Blob|null): MolFetched {
    return {type: MOL_FETCHED, nth, mol};
}

export const NOT_FOUND = "FILE:NOT_FOUND";

export interface NotFound {
    type: typeof NOT_FOUND;
}

export function NotFound(): NotFound {
    return {type: NOT_FOUND};
}

export const DESCRIPTOR_FETCH_FAILED = "FILE:DESCRIPTOR_FETCH_FAILED";

export interface DescriptorFetchFailed {
    type: typeof DESCRIPTOR_FETCH_FAILED;
}

export function DescriptorFetchFailed(): DescriptorFetchFailed {
    return {type: DESCRIPTOR_FETCH_FAILED};
}

export const CALCULATE = "FILE:CALCULATE";

export interface Calculate {
    type: typeof CALCULATE;
    id: string;
    disabled: string[];
}

export function Calculate(id: string, disabled: string[]): Calculate {
    return {type: CALCULATE, id, disabled};
}

export const CALCULATE_STARTED = "FILE:CALCULATE_STARTED";

export interface CalculateStarted {
    type: typeof CALCULATE_STARTED;
    id: string;
}

export function CalculateStarted(id: string): CalculateStarted {
    return{type: CALCULATE_STARTED, id};
}

export const CALCULATE_FAILURE = "FILE:CALCULATE_FAILURE";

export interface CalculateFailure {
    type: typeof CALCULATE_FAILURE;
    error: string;
}

export function CalculateFailure(error: string): CalculateFailure {
    return {type: CALCULATE_FAILURE, error};
}

export type FileAction
    = SetID
    | UpdateState
    | SetDownloadShown
    | SetDescriptors
    | SetDescriptorEnabled
    | SetAllDescriptorsEnabled
    | SetModalShown
    | SetFileInfo
    | CloseError
    | SetCurrentMol
    | MolFetched
    | NotFound
    | DescriptorFetchFailed
    | Calculate
    | CalculateStarted
    | CalculateFailure;

export function isFileAction(act: {type: string}): act is FileAction {
    return /^FILE:/.test(act.type);
}
