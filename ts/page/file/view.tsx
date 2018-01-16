import * as React from "react";

import * as Action from "./action";
import { FileState } from "./state";

import * as api from "../../api";
import * as Route from "../../route";
import { ViewState } from "../../util/dispatch";
import { BackButton, ConfigButton, HelpButton } from "../../view/button";
import { ErrorView } from "../../view/error-view";
import { Footer } from "../../view/footer";
import { LoadingView } from "../../view/loading-page";
import { ProgressView } from "../../view/progress-page";

import { ConfigModal } from "./config-modal";
import { DownloadDropdown } from "./download-dropdown";
import { MolViewer } from "./mol-view";

function getDisables(disabled: FileState["disabled"]): string[] {
    const disables: string[] = [];
    for (const key in disabled) {
        if (disabled.hasOwnProperty(key) && disabled[key]) {
            disables.push(key);
        }
    }
    return disables;
}

function MainFileView(props: ViewState<FileState, Action.FileAction>) {
    const mol: FileState["mols"][0] | undefined = props.mols[props.current];

    return (
        <div className="file-page page centered">
            <ConfigModal
                shown={props.modalShown}
                descriptors={props.descriptors || []}
                disabled={props.disabled}
                onClickOutside={() => props.dispatch(Action.SetModalShown(false))}
                onChangeDesc={(d, e) =>
                    props.dispatch(
                        Action.SetDescriptorEnabled({ name: d, enabled: e, store: true })
                    )}
                onChangeAll={e => props.dispatch(Action.SetAllDescriptorsEnabled(e))}
                onClick={() => props.dispatch(Action.SetModalShown(false))}
            />

            <div className="top-bar">
                <div>
                    <h2>
                        {props.name}
                    </h2>
                    <DownloadDropdown
                        shown={props.downloadShown}
                        id={props.id || ""}
                        onClickOutside={() => props.dispatch(Action.SetDownloadShown(false))}
                        onButtonClick={() =>
                            props.dispatch(Action.SetDownloadShown(!props.downloadShown))}
                    >
                        <a href={`/api/file/${props.id}.smi`}>SMILES</a>
                        <a href={`/api/file/${props.id}.sdf`}>SDF</a>
                    </DownloadDropdown>
                </div>

                <div>
                    <BackButton
                        onClick={() => props.dispatch(Route.ChangeLocation(Route.Upload()))}
                    />
                    <ConfigButton onClick={() => props.dispatch(Action.SetModalShown(true))} />
                    <HelpButton />
                </div>
            </div>

            {props.file_errors.map((e, i) =>
                <div className="toast toast-error" key={i}>
                    <button
                        onClick={() => props.dispatch(Action.CloseError(i))}
                        className="btn btn-clear float-right"
                    />
                    {e}
                </div>
            )}

            <MolViewer
                name={mol.name}
                forcefield={mol.forcefield}
                current={props.current}
                total={props.total}
                mol={mol.mol}
                is3D={props.is3D}
                onClickLeft={() => props.dispatch(Action.SetCurrentMol(props.current - 1))}
                onClickRight={() => props.dispatch(Action.SetCurrentMol(props.current + 1))}
            />

            <div className="action text-right calculate-action">
                <button
                    className="btn btn-primary"
                    disabled={!props.id}
                    onClick={() =>
                        props.dispatch(
                            Action.Calculate(props.id || "", getDisables(props.disabled))
                        )}
                >
                    Calculate
                </button>
            </div>

            <Footer />
        </div>
    );
}

export function FileView(props: ViewState<FileState, Action.FileAction>) {
    const onClickBack = () => props.dispatch(Route.ChangeLocation(Route.Upload()));

    if (props.phase === "not-found") {
        return (
            <ErrorView title="File ID not found" onClickBack={onClickBack}>
                {props.id}
            </ErrorView>
        );
    }

    if (props.phase === api.PHASE_PENDING || props.phase === api.PHASE_IN_PROGRESS) {
        const ratio = props.progress / props.total;
        const parcent = Math.round(ratio * 10000) / 100;
        return (
            <ProgressView
                title={props.phase === api.PHASE_PENDING ? "Pending" : "Preparing ..."}
                name={props.name}
                text={`${parcent}% (${props.progress}/${props.total})`}
                progress={ratio}
            />
        );
    }

    if (props.phase === api.PHASE_DONE && props.mols[props.current]) {
        return <MainFileView {...props} />;
    }

    if (props.phase === api.PHASE_ERROR) {
        return (
            <ErrorView
                title="Error"
                onClickBack={onClickBack}
                toasts={props.file_errors}
                onClickError={i => props.dispatch(Action.CloseError(i))}
            />
        );
    }

    return <LoadingView />;
}
