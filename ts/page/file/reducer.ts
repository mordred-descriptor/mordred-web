import * as objectAssign from "object-assign";

import deleteIndex from "../../util/deleteIndex";
import exhaustiveCheck from "../../util/exhaustiveCheck";
import * as Action from "./action";
import {FileState, initFile} from "./state";

export function fileReducer(state: FileState = initFile, action: Action.FileAction): FileState {
    let update: Partial<FileState> = {};
    switch (action.type) {
        case Action.SET_ID:
            update = {id: action.id};
            break;

        case Action.UPDATE_STATE:
            update = {
                total: action.total,
                current: action.current,
                done: action.done,
                name: action.name,
            };
            break;

        case Action.SET_DOWNLOAD_SHOWN:
            update = {downloadShown: action.shown};
            break;

        case Action.SET_DESCRIPTORS:
            update = {descriptors: action.descriptors};
            break;

        case Action.SET_DESCRIPTOR_ENABLED:
            const newDisabled = {...state.disabled};
            newDisabled[action.name] = !action.enabled;
            update = {disabled: newDisabled};
            break;

        case Action.SET_ALL_DESCRIPTORS_ENABLED:
            if (action.enabled) {
                update = {disabled: {}};
            } else {
                const disabled: {[key: string]: boolean} = {};
                for (const desc of state.descriptors || []) {
                    disabled[desc] = true;
                }
                update = {disabled};
            }
            break;

        case Action.SET_MODAL_SHOWN:
            update = {modalShown: action.shown};
            break;

        case Action.SET_FILE_INFO:
            update = {
                file_errors: action.errors,
                desalt: action.desalt,
                gen3D: action.gen3D,
                mols: action.mols,
                is3D: action.is3D,
                current: 0,
            };
            break;

        case Action.CLOSE_ERROR:
            update = {file_errors: deleteIndex(state.file_errors, action.index)};
            break;

        case Action.SET_CURRENT_MOL:
            update = {current: action.index};
            break;

        case Action.MOL_FETCHED:
            const newMols: FileState["mols"] = {...state.mols};
            newMols[action.nth].mol = action.mol;
            update = {mols: newMols};
            break;

        case Action.NOT_FOUND:
            update = {notFound: true};
            break;

        case Action.DESCRIPTOR_FETCH_FAILED:
            update = {descriptors: null};
            break;

        case Action.CALCULATE:
        case Action.CALCULATE_STARTED:
            break;

        case Action.CALCULATE_FAILURE:
            update = {file_errors: [action.error]};
            break;

        default:
            exhaustiveCheck(action);
            return state;
    }
    return objectAssign({}, state, update);
}
