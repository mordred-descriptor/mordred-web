import createHistory from "history/createBrowserHistory";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { connect, Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { createLogger } from "redux-logger";
import createSagaMiddleware from "redux-saga";
import { fork } from "redux-saga/effects";

import * as Route from "./route";
import { ViewState } from "./util/dispatch";
import exhaustiveCheck from "./util/exhaustiveCheck";

import { FileAction, fileReducer, fileSaga, FileView, isFileAction } from "./page/file";
import { isResultAction, ResultAction, resultReducer, resultSaga, ResultView } from "./page/result";
import { isUploadAction, UploadAction, uploadReducer, uploadSaga, UploadView } from "./page/upload";
import { initState, State } from "./state";

type Action = UploadAction | FileAction | ResultAction | Route.RouteAction;

function reducer(state: State = initState, action: Action): State {
    if (isUploadAction(action)) {
        return { ...state, upload: uploadReducer(state.upload, action) };
    } else if (isFileAction(action)) {
        return { ...state, file: fileReducer(state.file, action) };
    } else if (isResultAction(action)) {
        return { ...state, result: resultReducer(state.result, action) };
    } else if (Route.isRouteAction(action)) {
        return { ...state, route: Route.routeReducer(state.route, action) };
    } else {
        exhaustiveCheck(action);
        return state;
    }
}

function View(state: ViewState<State, Action>) {
    const { route, dispatch } = state;
    switch (route.type) {
        case Route.UPLOAD:
            return <UploadView dispatch={dispatch} {...state.upload} />;

        case Route.FILE:
            return <FileView dispatch={dispatch} {...state.file} />;

        case Route.RESULT:
            return <ResultView dispatch={dispatch} {...state.result} />;

        case Route.NOT_FOUND:
            return <h1>page not found</h1>;

        case Route.ON_LOAD_PAGE:
            return <div />;

        default:
            exhaustiveCheck(route);
            return (
                <div>
                    <h1>BUG: unknown route</h1>
                    <p>
                        {JSON.stringify(route)}
                    </p>
                </div>
            );
    }
}

function* saga(): IterableIterator<{}> {
    yield fork(uploadSaga);
    yield fork(fileSaga);
    yield fork(resultSaga);
    yield fork(Route.changeLocationSaga);
}

const sagaMiddleware = createSagaMiddleware();
const middlewares: any[] = [sagaMiddleware];

if (process.env.NODE_ENV !== "production") {
    middlewares.push(createLogger());
}

const store = createStore(reducer, applyMiddleware(...middlewares));
sagaMiddleware.run(saga);

Route.history.listen(location => {
    store.dispatch<Action>(Route.routing(location));
});

store.dispatch<Action>(Route.routing(Route.history.location));

const AppView = connect(v => v)(View);

ReactDOM.render(
    <Provider store={store}>
        <AppView />
    </Provider>,
    document.getElementById("main")
);
