import {ChangeLocation} from "../route";

export interface Dispatcher<V> {
    dispatch(v: V): void;
}

export type ViewState<S, A> = S & Dispatcher<A | ChangeLocation>;
