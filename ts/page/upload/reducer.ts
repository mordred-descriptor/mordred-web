import * as objectAssign from "object-assign";

import exhaustiveCheck from "../../util/exhaustiveCheck";
import * as Action from "./action";
import { UploadAction } from "./action";
import { initUpload, UploadState } from "./state";

export function uploadReducer(state: UploadState = initUpload, action: UploadAction): UploadState {
    let update: Partial<UploadState> = {};
    switch (action.type) {
        case Action.CHANGE_GENERATE_3D:
            update = { gen3D: action.enabled };
            break;

        case Action.CHANGE_DESALT:
            update = { desalt: action.enabled };
            break;

        case Action.SET_FILE:
            update = { file: action.file };
            break;

        case Action.UPLOADED:
            break;

        case Action.SET_ERROR:
            update = { error: action.error };
            break;

        case Action.SET_FILE_SIZE_LIMIT:
            update = { file_size_limit: action.limit };
            break;

        default:
            exhaustiveCheck(action);
            return state;
    }

    return objectAssign({}, state, update);
}
