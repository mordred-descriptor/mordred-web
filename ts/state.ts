import {FileState, initFile} from "./page/file";
import {initResult, ResultState} from "./page/result";
import {initUpload, UploadState} from "./page/upload";
import * as Route from "./route";

export interface State {
    route: Route.Route;
    upload: UploadState;
    result: ResultState;
    file: FileState;
}

export const initState: State = {
    route: Route.OnLoadPage(),
    upload: initUpload,
    result: initResult,
    file: initFile,
};
