import * as objectAssign from "object-assign";

import {DescriptorInfo} from "../../api";
import exhaustiveCheck from "../../util/exhaustiveCheck";
import * as Action from "./action";
import {initResult, ResultState} from "./state";

export function resultReducer(state: ResultState = initResult, action: Action.ResultAction): ResultState {
    let update: Partial<ResultState> = {};
    switch (action.type) {
        case Action.SET_ID:
            update = {id: action.id};
            break;

        case Action.NOT_FOUND:
            update = {notFound: true};
            break;

        case Action.UPDATE_STATE:
            update = {
                total: action.total,
                current: action.current,
                name: action.name,
                done: action.done,
            };
            break;

        case Action.SET_RESULT_INFO:
            update = {
                file_id: action.file_id,
                file_name: action.file_name,
                descriptorInfo: action.descriptors.map((d, i) => {
                    return {...d, index: i};
                }),
            };
            break;

        case Action.SET_DOWNLOAD_DROPDOWN:
            update = {downloadShown: action.shown};
            break;

        case Action.CHANGE_SORT:
            const newDI = state.descriptorInfo.slice();
            const sortBy = action.sortBy;

            const makeCompare = (lg: number, sm: number) => {
                return (a: DescriptorInfo, b: DescriptorInfo) => {
                    const x = a[sortBy];
                    const y = b[sortBy];
                    if (x === null) { return sm; }
                    if (y === null) { return lg; }
                    return x > y ? lg : sm;
                };
            };

            const compare = (action.sortDirection === "ASC") ?
                makeCompare(1, -1) :
                makeCompare(-1, 1);

            newDI.sort(compare);

            update = {
                sortBy: action.sortBy,
                sortDirection: action.sortDirection,
                descriptorInfo: newDI,
            };
            break;

        default:
            exhaustiveCheck(action);
            return state;
    }
    return objectAssign({}, state, update);
}
