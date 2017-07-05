import { delay } from "redux-saga";
import { call, put, select, take, takeLatest } from "redux-saga/effects";

import * as api from "../../api";
import * as Route from "../../route";
import { State } from "../../state";
import exhaustiveCheck from "../../util/exhaustiveCheck";

import * as Action from "./action";

export function* resultSaga(): IterableIterator<{}> {
    yield takeLatest<Route.Result>(Route.RESULT, function*({ id }): IterableIterator<{}> {
        yield put(Action.SetID(id));
    });

    yield takeLatest<Action.SetID>(Action.SET_ID, function*({ id }): IterableIterator<{}> {
        const chan = yield call(api.calcChannel, id);

        while (true) {
            const data: api.CalcChannelMessage = yield take(chan);
            if (data.error) {
                yield put(Action.NotFound());
                break;
            } else {
                yield put(Action.UpdateState(data));
            }
        }
    });

    yield takeLatest<Action.UpdateState>(Action.UPDATE_STATE, function*({
        done
    }): IterableIterator<{}> {
        if (!done) {
            return;
        }

        const id: string = yield select<State>(s => s.result.id);

        try {
            const resultInfo: api.ResultInfo = yield call(api.getResultInfo, id);
            yield put(Action.SetResultInfo(resultInfo));
        } catch (e) {
            yield put(Action.NotFound());
        }
    });
}
