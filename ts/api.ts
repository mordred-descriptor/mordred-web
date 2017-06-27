import axios from "axios";
import {AxiosResponse} from "axios";
import * as promise from "es6-promise";
import * as qs from "qs";
import {Channel, END, eventChannel} from "redux-saga";

export interface UploadProps {
    file: File;
    gen3D: boolean;
    desalt: boolean;
}

export async function uploadFile({file, gen3D, desalt}: UploadProps): promise.Promise<string> {
    const data = new FormData();
    data.append("file", file);
    data.append("gen3D", gen3D.toString());
    data.append("desalt", desalt.toString());

    const r = await axios.post("/api/file", data);
    return r.data.id;
}

export type ChannelMessage<T> = T & {error: false} | {error: true, payload: any};

export function makeEventSource<T>(url: string, check: (d: T) => boolean): Channel<ChannelMessage<T>> {
    return eventChannel<ChannelMessage<T>>((emit) => {
        const es = new EventSource(url);

        es.onmessage = (msg) => {
            const d = JSON.parse(msg.data);
            emit({...d, error: false});
            if (check(d)) {
                emit(END);
            }
        };

        es.onerror = (e) => {
            emit({error: true, payload: e});
        };

        return () => {
            es.close();
        };
    });
}

export interface FileChannelMessagePayload {
    total: number;
    done: boolean;
    current: number;
    name: string;
}

export type FileChannelMessage = ChannelMessage<FileChannelMessagePayload>;

export function fileChannel(id: string): Channel<FileChannelMessage> {
    return makeEventSource<FileChannelMessagePayload>(`/api/file/${id}`, (d) => d.done);
}

export async function getDescriptors(): promise.Promise<string[]> {
    const r = await axios.get("/api/descriptor");
    return r.data.descriptors;
}

export interface FileInfoResult {
    name: string;
    gen3D: boolean;
    is3D: boolean;
    desalt: boolean;
    mols: Array<{name: string, forcefield: string}>;
    errors: string[];
}

export async function getFileInfo(id: string): promise.Promise<FileInfoResult> {
    const r = await axios.get(`/api/file/${id}`);
    return r.data;
}

export async function getPNG(id: string, nth: number): promise.Promise<Blob> {
    const {data} = await axios.get(`/api/file/${id}/${nth}.png`, {responseType: "blob"});
    return data;
}

export async function getMol(id: string, nth: number): promise.Promise<Blob> {
    const {data} = await axios.get(`/api/file/${id}/${nth}.mol`, {responseType: "blob"});
    return data;
}

export async function startCalc(id: string, disabled: string[]): promise.Promise<string> {
    const params = qs.stringify({disabled}, {indices: false});
    const {data} = await axios.post(`/api/calc/${id}`, params);
    return data.id;
}

export interface CalcChannelMessagePayload {
    total: number;
    done: boolean;
    current: number;
    name: string;
}

export type CalcChannelMessage = ChannelMessage<CalcChannelMessagePayload>;

export function calcChannel(id: string): Channel<CalcChannelMessage> {
    return makeEventSource<CalcChannelMessagePayload>(`/api/calc/${id}`, (d) => d.done);
}

export interface DescriptorInfo {
    name: string;
    max: number|null;
    min: number|null;
    mean: number|null;
    std: number|null;
    [key: string]: string|number|null;
}

export interface ResultInfo {
    file_name: string;
    file_id: string;
    descriptors: DescriptorInfo[];
}

export async function getResultInfo(id: string): promise.Promise<ResultInfo> {
    const {data} = await axios.get(`/api/calc/${id}`);
    return data;
}

export interface AppInfo {
    file_size_limit: number;
}

export async function getAppInfo(): promise.Promise<AppInfo> {
    const {data} = await axios.get("/api/info");
    return data;
}
