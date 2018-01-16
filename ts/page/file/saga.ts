import { delay } from "redux-saga";
import { call, put, select, take, takeLatest } from "redux-saga/effects";

import * as api from "../../api";
import * as Route from "../../route";
import { State } from "../../state";
import * as storage from "../../storage";
import exhaustiveCheck from "../../util/exhaustiveCheck";

import * as Action from "./action";

function* getMolecule() {
    const { current, mols, id, is3D }: State["file"] = yield select<State>(s => s.file);
    const mol = mols[current];
    if (mol === undefined || !(mol.mol === undefined)) {
        return;
    }

    try {
        const blob = yield call(api.getMol, id || "", current);
        yield put(Action.MolFetched(current, blob));
    } catch (e) {
        yield put(Action.MolFetched(current, null));
    }
}

function* setId({ id }: { id: string }): IterableIterator<{}> {
    yield put(Action.SetID(id));
}

function* getProgress({ id }: { id: string }): IterableIterator<{}> {
    const chan = yield call(api.fileChannel, id);

    while (true) {
        const data: api.FileChannelMessage = yield take(chan);
        if (data.error) {
            yield put(Action.NotFound());
            break;
        } else {
            yield put(Action.UpdateState(data));
        }
    }
}

function* getDescriptorList(): IterableIterator<{}> {
    const hasDescs = yield select<State>(s => !s.file.descriptors);
    if (hasDescs) {
        return;
    }

    try {
        const descs: string[] = yield call(api.getDescriptors);
        yield put(Action.SetDescriptors(descs));
    } catch (e) {
        yield put(Action.DescriptorFetchFailed());
    }
}

function* getFileInfo({ phase }: { phase: api.Phase }): IterableIterator<{}> {
    if (phase === api.PHASE_PENDING || phase === api.PHASE_IN_PROGRESS) {
        return;
    }

    const id: string = yield select<State>(s => s.file.id);

    try {
        const fileInfo: api.FileInfoResult = yield call(api.getFileInfo, id);
        yield put(Action.SetFileInfo(fileInfo));
    } catch (e) {
        yield put(Action.NotFound());
    }
}

function* calculate({ id, disabled }: { id: string; disabled: string[] }): IterableIterator<{}> {
    try {
        const calcId: string = yield call(api.startCalc, id, disabled);
        yield put(Action.CalculateStarted(calcId));
    } catch (e) {
        yield put(Action.CalculateFailure(e.toString()));
    }
}

function* jumpResult({ id }: { id: string }): IterableIterator<{}> {
    yield put(Route.ChangeLocation(Route.Result(id)));
}

function* storeDisables(): IterableIterator<{}> {
    const disabled: State["file"]["disabled"] = yield select<State>(s => s.file.disabled);
    const ds = [];
    for (const key in disabled) {
        if (disabled.hasOwnProperty(key) && disabled[key]) {
            ds.push(key);
        }
    }
    storage.storeDisabledDescriptors(ds);
}

function* storeDisabledDescriptors({ store }: { store: boolean }): IterableIterator<{}> {
    if (!store) {
        return;
    }
    yield storeDisables();
}

function* loadDisabledDescriptors(): IterableIterator<{}> {
    const ds = storage.loadDisabledDescriptors();
    for (const v of ds) {
        yield put(Action.SetDescriptorEnabled({ name: v, enabled: false, store: false }));
    }
}

export function* fileSaga(): IterableIterator<{}> {
    yield takeLatest<Route.File>(Route.FILE, setId);
    yield takeLatest<Route.File>(Route.FILE, getDescriptorList);

    yield takeLatest<Action.SetID>(Action.SET_ID, getProgress);
    yield takeLatest<Action.SetDescriptors>(Action.SET_DESCRIPTORS, loadDisabledDescriptors);

    yield takeLatest<Action.UpdateState>(Action.UPDATE_STATE, getFileInfo);

    yield takeLatest<Action.Calculate>(Action.CALCULATE, calculate);

    yield takeLatest<Action.CalculateStarted>(Action.CALCULATE_STARTED, jumpResult);

    yield takeLatest<Action.SetDescriptorEnabled>(
        Action.SET_DESCRIPTOR_ENABLED,
        storeDisabledDescriptors
    );
    yield takeLatest<Action.SetAllDescriptorsEnabled>(
        Action.SET_ALL_DESCRIPTORS_ENABLED,
        storeDisables
    );

    yield takeLatest<Action.SetFileInfo>(Action.SET_FILE_INFO, getMolecule);
    yield takeLatest<Action.SetCurrentMol>(Action.SET_CURRENT_MOL, getMolecule);
}
