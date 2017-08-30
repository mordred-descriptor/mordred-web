import * as React from "react";

export interface ButtonProps {
    onClick: () => void;
}

export function BackButton(props: ButtonProps) {
    return (
        <button
            className="btn btn-link tooltip tooltip-left"
            data-tooltip="Back"
            onClick={props.onClick}
        >
            <i className="fa fa-undo" />
        </button>
    );
}

export function ConfigButton(props: ButtonProps) {
    return (
        <button
            className="btn btn-link tooltip tooltip-left"
            data-tooltip="Config"
            onClick={props.onClick}
        >
            <i className="fa fa-lg fa-cog" />
        </button>
    );
}

export function HomeButton(props: ButtonProps) {
    return (
        <button
            className="btn btn-link tooltip tooltip-left"
            data-tooltip="Top"
            onClick={props.onClick}
        >
            <i className="fa fa-lg fa-home" />
        </button>
    );
}

export function HelpButton() {
    return (
        <a
            className="btn btn-link tooltip tooltip-left"
            data-tooltip="help"
            href="https://github.com/mordred-descriptor/mordred-web/tree/master/help/index.md"
            target="_blank"
        >
            <i className="fa fa-lg fa-question" />
        </a>
    );
}
