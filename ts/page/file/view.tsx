import * as className from "classnames";
import * as React from "react";
import {default as handleClickOutside, InjectedOnClickOutProps} from "react-onclickoutside";

import * as Action from "./action";
import {FileState} from "./state";

import * as api from "../../api";
import * as Route from "../../route";
import {Dispatcher} from "../../util/dispatch";
import {ViewState} from "../../util/dispatch";
import {Dropdown} from "../../view/dropdown";
import {Footer} from "../../view/footer";
import {LoadingView} from "../../view/loading-page";
import {MolViewer} from "../../view/mol-viewer";
import {ProgressView} from "../../view/progress-page";
import {Switch} from "../../view/switch";

type ConfigModalContainerProps = ViewState<FileState, Action.FileAction> & InjectedOnClickOutProps;

class ConfigModalContainerImpl extends React.Component<ConfigModalContainerProps, {}> {
    public handleClickOutside(ev: any) {
        this.props.dispatch(Action.SetModalShown(false));
    }

    public render() {
        const state = this.props;

        let all = true;
        for (const desc of state.descriptors || []) {
            if (state.disabled[desc]) {
                all = false;
                break;
            }
        }

        const body = (!state.descriptors) ?
            (state.descriptors === null ?
                <div className="toast toast-error">failed to load descriptor list</div> :
                <div className="loading"/>) :
            state.descriptors.map((d, i) =>
                <Switch
                    key={i}
                    checked={!state.disabled[d]}
                    onChange={(v) => state.dispatch(Action.SetDescriptorEnabled({name: d, enabled: v.target.checked, store: true}))}
                >{d}</Switch>,
            );

        return (
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Descriptor config</div>
                    <Switch
                        checked={all}
                        onChange={(v) => state.dispatch(Action.SetAllDescriptorsEnabled(v.target.checked))}
                        >all</Switch>
                </div>

                <div className="modal-body">{body}</div>

                <div className="modal-footer">
                    <button
                        className="btn btn-primary"
                        onClick={() => state.dispatch(Action.SetModalShown(false))}
                    >Close</button>
                </div>
            </div>
        );
    }
}

const ConfigModalContainer = handleClickOutside<ViewState<FileState, Action.FileAction>>(ConfigModalContainerImpl);

class ConfigModal extends React.Component<ViewState<FileState, Action.FileAction>, {}> {
    public render() {
        const state = this.props;

        return (
            <div className={className("modal descriptor-modal", {active: state.modalShown})}>
                <div className="modal-overlay"/>
                <ConfigModalContainer disableOnClickOutside={!state.modalShown} {...state}/>
            </div>
        );
    }
}

function DownloadDropdown(state: ViewState<FileState, Action.FileAction>) {
    return (
        <Dropdown
            active={state.downloadShown}
            onClickOutside={() => state.dispatch(Action.SetDownloadShown(false))}
            buttonData={{tooltip: "Download"}}
            buttonProps={{
                className: "btn btn-link dropdown-toggle tooltip tooltip-right",
                onClick: () => state.dispatch(Action.SetDownloadShown(!state.downloadShown)),
                children: <i className="fa fa-lg fa-download"/>,
            }}
            disableOnClickOutside={!state.downloadShown}
            >
            <a href={`/api/file/${state.id}.smi`}>SMILES</a>
            <a href={`/api/file/${state.id}.sdf`}>SDF</a>
        </Dropdown>
    );
}

function MainFileView(state: ViewState<FileState, Action.FileAction>) {
    const mol = state.mols[state.current];

    const doCalculate = () => {
        const disables = [];
        for (const key in state.disabled) {
            if (state.disabled.hasOwnProperty(key) && state.disabled[key]) {
                disables.push(key);
            }
        }
        state.dispatch(Action.Calculate(state.id || "", disables));
    };

    return (
        <div className="file-page page centered">
            <div className="top-bar">
                <div className="filename">
                    <h2>{state.name}</h2>
                    <DownloadDropdown {...state}/>
                </div>

                <ConfigModal {...state}/>

                <button
                    className="btn btn-link"
                    onClick={() => state.dispatch(Action.SetModalShown(true))}>
                    <i className="fa fa-lg fa-cog"/>
                </button>
            </div>

            {state.file_errors.map((e, i) =>
                <div className="toast toast-error" key={i}>
                    <button
                        onClick={() => state.dispatch(Action.CloseError(i))}
                        className="btn btn-clear float-right"/>
                    {e}
                </div>,
            )}

            <div className="mol-view-container">
                <div className="mol-name">
                    <h4 className="text-center">{mol.name} {mol.forcefield ? <span className="forcefield label">{mol.forcefield}</span> : null}</h4>
                </div>

                <div className="mol-view">
                    <button
                        className="btn btn-link mol-nav mol-nav-left"
                        disabled={state.current <= 0}
                        onClick={() => state.dispatch(Action.SetCurrentMol(state.current - 1))}
                        >
                        <i className="fa fa-angle-left fa-2x"/>
                    </button>
                    <div className="mol-display-wrapper">
                        {mol.mol === undefined ? <div className="loading"/> : null}
                        {mol.mol === null ? <i className="failed fa fa-2x fa-times"/> : null}
                        {state.is3D ?
                            <MolViewer backgroundColor="white" className="mol-display" src={mol.mol || undefined} loaderParams={{ext: "sdf"}}/> :
                            (mol.mol ? <img className="mol-display" src={window.URL.createObjectURL(mol.mol)}/> : <div className="mol-display"/>)
                        }
                    </div>
                    <button
                        className="btn btn-link mol-nav mol-nav-right"
                        disabled={state.current >= state.total - 1}
                        onClick={() => state.dispatch(Action.SetCurrentMol(state.current + 1))}
                        >
                        <i className="fa fa-angle-right fa-2x"/>
                    </button>
                </div>

                <div className="jump-field text-center">
                {state.current + 1}/{state.total}
                </div>
            </div>
            <div className="action text-right calculate-action">
                <a href="/" className="btn btn-link">Back</a>
                <button className="btn btn-primary" onClick={doCalculate}>Calculate</button>
            </div>

            <Footer/>
        </div>
    );
}

export function FileView(state: ViewState<FileState, Action.FileAction>) {
    if (state.notFound) {
        return (
            <div className="file-page page centered">
                <h2>ID not found</h2>
                <p>{state.id}</p>
            </div>
        );
    }

    if (state.id === null || state.total === 0) {
        return <LoadingView/>;
    }

    if (!state.done) {
        const ratio = state.current / state.total;
        const parcent = Math.round(ratio * 10000) / 100;
        return <ProgressView
            title="Prepareing ..."
            name={state.name}
            text={`${parcent}% (${state.current}/${state.total})`}
            progress={ratio}
            />;
    }

    if (state.mols[state.current]) {
        return <MainFileView {...state}/>;
    }

    return <LoadingView/>;
}
