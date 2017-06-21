import {call, put, select, takeLatest} from "redux-saga/effects";

import * as api from "../../api";
import * as Route from "../../route";
import {State} from "../../state";
import * as Action from "./action";
import {UploadState} from "./state";

import * as storage from "../../storage";

function* uploadFile({file}: Action.SetFile): IterableIterator<{}> {
    if (file === null) {
        return;
    }
    const {desalt, gen3D}: UploadState = yield select<State>((s) => s.upload);
    try {
        const id: string = yield call(api.uploadFile, {file, gen3D, desalt});
        yield put(Action.Uploaded(id));
    } catch (e) {
        yield put(Action.SetError(e.toString()));
    }
}

function* uploaded({id}: Action.Uploaded): IterableIterator<{}> {
    yield put(Route.ChangeLocation(Route.File(id)));
}

function* restoreConfig(): IterableIterator<{}> {
    const desalt = storage.loadDesalt();
    const generate3D = storage.loadGenerate3D();

    yield put(Action.ChangeDesalt({enabled: desalt, store: false}));
    yield put(Action.ChangeGenerate3D({enabled: generate3D, store: false}));
}

function* storeDesalt({enabled, store}: Action.ChangeDesalt): IterableIterator<{}> {
    if (store) {
        storage.storeDesalt(enabled);
    }
}

function* storeGenerate3D({enabled, store}: Action.ChangeGenerate3D): IterableIterator<{}> {
    if (store) {
        storage.storeGenerate3D(enabled);
    }
}

export function* uploadSaga(): IterableIterator<{}> {
    yield takeLatest<Route.Upload>(Route.UPLOAD, restoreConfig);
    yield takeLatest<Action.SetFile>(Action.SET_FILE, uploadFile);
    yield takeLatest<Action.Uploaded>(Action.UPLOADED, uploaded);
    yield takeLatest<Action.ChangeDesalt>(Action.CHANGE_DESALT, storeDesalt);
    yield takeLatest<Action.ChangeGenerate3D>(Action.CHANGE_GENERATE_3D, storeGenerate3D);
}
