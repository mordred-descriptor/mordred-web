import * as React from "react";
import { Footer } from "./footer";

export interface ErrorViewProps {
    title: string;
    onClickBack: () => void;
    toasts?: string[];
    onClickError?: (i: number) => void;
    children?: React.ReactNode;
}

export function ErrorView(props: ErrorViewProps) {
    const onClickError = props.onClickError || ((i: number) => {});
    return (
        <div className="file-page page centered">
            <div className="top-bar">
                <div>
                    <h2>
                        {props.title}
                    </h2>
                </div>

                <div>
                    <button
                        className="btn btn-link tooltip tooltip-left"
                        data-tooltip="Back"
                        onClick={props.onClickBack}
                    >
                        <i className="fa fa-undo" />
                    </button>
                </div>
            </div>

            {(props.toasts || []).map((e, i) =>
                <div className="toast toast-error" key={i}>
                    <button onClick={() => onClickError(i)} className="btn btn-clear float-right" />
                    {e}
                </div>
            )}

            {props.children}

            <Footer />
        </div>
    );
}
