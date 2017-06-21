import {SortDirectionType} from "react-virtualized";

import * as api from "../../api";

export const SET_ID = "RESULT:SET_ID";

export interface SetID {
    type: typeof SET_ID;
    id: string;
}

export function SetID(id: string): SetID {
    return {type: SET_ID, id};
}

export const NOT_FOUND = "RESULT:NOT_FOUND";

export interface NotFound {
    type: typeof NOT_FOUND;
}

export function NotFound(): NotFound {
    return {type: NOT_FOUND};
}

export const UPDATE_STATE = "RESULT:UPDATE_STATE";

export type UpdateState = {type: typeof UPDATE_STATE} & api.CalcChannelMessagePayload;

export function UpdateState(m: api.CalcChannelMessagePayload): UpdateState {
    return {...m, type: UPDATE_STATE};
}

export const SET_RESULT_INFO = "RESULT:SET_RESULT_INFO";

export type SetResultInfo = {type: typeof SET_RESULT_INFO} & api.ResultInfo;

export function SetResultInfo(i: api.ResultInfo): SetResultInfo {
    return {type: SET_RESULT_INFO, ...i};
}

export const SET_DOWNLOAD_DROPDOWN = "RESULT:SET_DOWNLOAD_DROPDOWN";

export interface SetDownloadShown {
    type: typeof SET_DOWNLOAD_DROPDOWN;
    shown: boolean;
}

export function SetDownloadShown(shown: boolean): SetDownloadShown {
    return {type: SET_DOWNLOAD_DROPDOWN, shown};
}

export const CHANGE_SORT = "RESULT:CHANGE_SORT";

export interface ChangeSort {
    type: typeof CHANGE_SORT;
    sortBy: "index"|"min"|"max"|"mean"|"std";
    sortDirection: SortDirectionType;
}

export function ChangeSort(v: {sortBy: "index"|"min"|"max"|"mean"|"std", sortDirection: SortDirectionType}): ChangeSort {
    return {type: CHANGE_SORT, sortBy: v.sortBy, sortDirection: v.sortDirection};
}

export type ResultAction
    = SetID
    | NotFound
    | UpdateState
    | SetResultInfo
    | SetDownloadShown
    | ChangeSort;

export function isResultAction(act: {type: string}): act is ResultAction {
    return /^RESULT:/.test(act.type);
}
