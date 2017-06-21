import {createBrowserHistory, Location} from "history";
import {takeLatest} from "redux-saga/effects";
import exhaustiveCheck from "./util/exhaustiveCheck";

export const UPLOAD: "ROUTE:UPLOAD" = "ROUTE:UPLOAD";
export const FILE: "ROUTE:FILE" = "ROUTE:FILE";
export const RESULT: "ROUTE:RESULT" = "ROUTE:RESULT";
export const NOT_FOUND: "ROUTE:NOT_FOUND" = "ROUTE:NOT_FOUND";
export const ON_LOAD_PAGE: "ROUTE:ON_LOAD_PAGE" = "ROUTE:ON_LOAD_PAGE";

export interface Upload {
    type: typeof UPLOAD;
}

export function Upload(): Upload {
    return {type: UPLOAD};
}

export interface File {
    type: typeof FILE;
    id: string;
}

export function File(id: string): File {
    return {type: FILE, id};
}

export interface Result {
    type: typeof RESULT;
    id: string;
}

export function Result(id: string): Result {
    return {type: RESULT, id};
}

export interface NotFound {
    type: typeof NOT_FOUND;
}

export function NotFound(): NotFound {
    return {type: NOT_FOUND};
}

export interface OnLoadPage {
    type: typeof ON_LOAD_PAGE;
}

export function OnLoadPage(): OnLoadPage {
    return {type: ON_LOAD_PAGE};
}

export type Route
    = Upload
    | Result
    | File

    | NotFound
    | OnLoadPage;

export type RouteChanged = Route;

export function isRouteChanged(a: {type: string}): a is RouteChanged {
    return /^ROUTE:/.test(a.type);
}

export const CHANGE_LOCATION: "CHANGE_LOCATION" = "CHANGE_LOCATION";

export interface ChangeLocation {
    type: typeof CHANGE_LOCATION;
    route: Route;
}

export function ChangeLocation(r: Route): ChangeLocation {
    return {type: CHANGE_LOCATION, route: r};
}

export type RouteAction
    = RouteChanged
    | ChangeLocation;

export function isRouteAction(a: {type: string}): a is RouteAction {
    return isRouteChanged(a) || a.type === CHANGE_LOCATION;
}

export const history = createBrowserHistory();

const FILE_PATTERN = /^\/file\/([a-zA-Z0-9]+)$/;
const RESULT_PATTERN = /^\/result\/([a-zA-Z0-9]+)$/;

export function routing(loc: Location): Route {
    if (loc.pathname === "/") {
        return Upload();
    }

    const file = FILE_PATTERN.exec(loc.pathname);

    if (file) {
        return File(file[1]);
    }

    const result = RESULT_PATTERN.exec(loc.pathname);

    if (result) {
        return Result(result[1]);
    }

    return NotFound();
}

export function pushHistory(route: Route): void {
    switch (route.type) {
        case UPLOAD:
            return history.push("/");

        case RESULT:
            return history.push("/result/" + route.id);

        case FILE:
            return history.push("/file/" + route.id);

        case NOT_FOUND:
        case ON_LOAD_PAGE:
            return;

        default:
            exhaustiveCheck(route);
    }
}

export function* changeLocationSaga() {
    yield takeLatest<ChangeLocation>(CHANGE_LOCATION, (act) => pushHistory(act.route));
}

export function routeReducer(state: Route, action: RouteAction): Route {
    if (isRouteChanged(action)) {
        return action;
    } else {
        return state;
    }
}
