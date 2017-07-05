import * as React from "react";

import { MolViewer as MV } from "../../view/mol-viewer";

export interface MolProps {
    name: string;
    forcefield?: string;
    current: number;
    total: number;

    mol: Blob | undefined | null;
    is3D: boolean;

    onClickLeft: () => void;
    onClickRight: () => void;
}

function MolDisplay({ mol, is3D }: { mol: MolProps["mol"]; is3D: boolean }): JSX.Element {
    let overlay: React.ReactNode = null;
    if (mol === undefined) {
        overlay = <div className="loading" />;
    } else if (mol === null) {
        overlay = <i className="failed fa fa-2x fa-times" />;
    }

    let body: React.ReactNode = null;
    if (is3D) {
        body = (
            <MV
                backgroundColor="white"
                className="mol-display"
                src={mol || undefined}
                loaderParams={{ ext: "sdf" }}
            />
        );
    } else if (mol) {
        body = <img className="mol-display" src={window.URL.createObjectURL(mol)} />;
    } else {
        body = <div className="mol-display" />;
    }

    return (
        <div className="mol-display-wrapper">
            {overlay}
            {body}
        </div>
    );
}

export function MolViewer(props: MolProps) {
    return (
        <div className="mol-view-container">
            <div className="mol-name">
                <h4 className="text-center">
                    {props.name}{" "}
                    {props.forcefield
                        ? <span className="forcefield label">
                              {props.forcefield}
                          </span>
                        : null}
                </h4>
            </div>

            <div className="mol-view">
                <button
                    className="btn btn-link mol-nav mol-nav-left"
                    disabled={props.current <= 0}
                    onClick={props.onClickLeft}
                >
                    <i className="fa fa-angle-left fa-2x" />
                </button>
                <MolDisplay mol={props.mol} is3D={props.is3D} />
                <button
                    className="btn btn-link mol-nav mol-nav-right"
                    disabled={props.current >= props.total - 1}
                    onClick={props.onClickRight}
                >
                    <i className="fa fa-angle-right fa-2x" />
                </button>
            </div>

            <div className="jump-field text-center">
                {props.current + 1}/{props.total}
            </div>
        </div>
    );
}
