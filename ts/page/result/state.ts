import {SortDirectionType} from "react-virtualized";
import * as api from "../../api";

export interface ResultState {
    id: string|null;
    notFound: boolean;

    total: number;
    current: number;
    name: string|null;
    done: boolean;

    file_name: string;
    file_id: string;
    descriptorInfo: Array<api.DescriptorInfo & {index: number}>;

    downloadShown: boolean;

    sortBy: "index"|"min"|"max"|"mean"|"std";
    sortDirection: SortDirectionType;
}

export const initResult: ResultState = {
    id: null,
    notFound: false,

    total: 0,
    current: 0,
    name: null,
    done: false,

    file_name: "",
    file_id: "",
    descriptorInfo: [],

    downloadShown: false,

    sortBy: "index",
    sortDirection: "ASC",
};
