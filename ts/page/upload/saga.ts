import { call, put, select, takeLatest } from "redux-saga/effects";

import * as api from "../../api";
import * as Route from "../../route";
import { State } from "../../state";
import * as Action from "./action";
import { UploadState } from "./state";

import * as storage from "../../storage";

const MEGA = 1024 * 1024;

function* uploadFile({ file }: Action.SetFile): IterableIterator<{}> {
    if (file === null) {
        return;
    }

    const { desalt, gen3D, file_size_limit }: UploadState = yield select<State>(s => s.upload);

    if (file.size > file_size_limit * MEGA) {
        yield put(Action.SetError(`file size too large (> ${file_size_limit}MB)`));
        return;
    }
    try {
        const id: string = yield call(api.uploadFile, { file, gen3D, desalt });
        yield put(Action.Uploaded(id));
    } catch (e) {
        if (e.response) {
            const r = e.response;
            if (r.status && r.statusText) {
                yield put(Action.SetError(`${r.status} ${r.statusText}`));
            }
        } else {
            yield put(Action.SetError(e.toString()));
        }
    }
}

function* uploaded({ id }: Action.Uploaded): IterableIterator<{}> {
    yield put(Route.ChangeLocation(Route.File(id)));
}

function* restoreConfig(): IterableIterator<{}> {
    const desalt = storage.loadDesalt();
    const generate3D = storage.loadGenerate3D();

    yield put(Action.ChangeDesalt({ enabled: desalt, store: false }));
    yield put(Action.ChangeGenerate3D({ enabled: generate3D, store: false }));
}

function* setFileSizeLimit(): IterableIterator<{}> {
    try {
        const info: api.AppInfo = yield call(api.getAppInfo);
        yield put(Action.SetFileSizeLimit(info.file_size_limit));
    } catch (e) {
        yield put(Action.SetError(e.toString()));
    }
}

function* storeDesalt({ enabled, store }: Action.ChangeDesalt): IterableIterator<{}> {
    if (store) {
        storage.storeDesalt(enabled);
    }
}

function* storeGenerate3D({ enabled, store }: Action.ChangeGenerate3D): IterableIterator<{}> {
    if (store) {
        storage.storeGenerate3D(enabled);
    }
}

export function* uploadSaga(): IterableIterator<{}> {
    yield takeLatest<Route.Upload>(Route.UPLOAD, restoreConfig);
    yield takeLatest<Route.Upload>(Route.UPLOAD, setFileSizeLimit);
    yield takeLatest<Action.SetFile>(Action.SET_FILE, uploadFile);
    yield takeLatest<Action.Uploaded>(Action.UPLOADED, uploaded);
    yield takeLatest<Action.ChangeDesalt>(Action.CHANGE_DESALT, storeDesalt);
    yield takeLatest<Action.ChangeGenerate3D>(Action.CHANGE_GENERATE_3D, storeGenerate3D);
}
