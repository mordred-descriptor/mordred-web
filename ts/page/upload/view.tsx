import * as React from "react";

import * as Route from "../../route";
import { ViewState } from "../../util/dispatch";
import { HelpButton } from "../../view/button";
import { Footer } from "../../view/footer";
import { Switch } from "../../view/switch";
import * as Action from "./action";
import { UploadState } from "./state";

export function UploadView(state: ViewState<UploadState, Action.UploadAction>) {
    return (
        <div className="upload-page page centered">
            <div className="top-bar">
                <div>
                    <h2>&nbsp;</h2>
                </div>
                <div>
                    <HelpButton />
                </div>
            </div>
            <div className="empty">
                <h2 className="empty-title">Mordred Web UI</h2>
                <p className="empty-subtitle">Descriptor calculator</p>
                {!state.error ? null : (
                    <div className="toast toast-error">
                        <button
                            onClick={() => state.dispatch(Action.SetError(null))}
                            className="btn btn-clear float-right"
                        />
                        {state.error}
                    </div>
                )}
                <div className="empty-action upload-button-container">
                    <input
                        type="file"
                        hidden
                        id="upload-file"
                        onChange={v =>
                            state.dispatch(
                                Action.SetFile(v.target.files ? v.target.files[0] || null : null)
                            )
                        }
                    />
                    <label htmlFor="upload-file" className="btn btn-primary">
                        Upload
                    </label>
                    <div>
                        <a
                            className="download-example tooltip tooltip-bottom"
                            data-tooltip="download example smi file"
                            href="/static/examples/example.smi"
                        >
                            smi
                        </a>{" "}
                        or{" "}
                        <a
                            className="download-example tooltip tooltip-bottom"
                            data-tooltip="download example sdf file"
                            href="/static/examples/example.sdf"
                        >
                            sdf
                        </a>{" "}
                        file
                    </div>
                </div>
                <div className="empty-action">
                    <Switch
                        checked={state.gen3D}
                        onChange={v =>
                            state.dispatch(
                                Action.ChangeGenerate3D({ enabled: v.target.checked, store: true })
                            )
                        }
                    >
                        Generate 3D conformer
                    </Switch>
                    <Switch
                        checked={state.desalt}
                        onChange={v =>
                            state.dispatch(
                                Action.ChangeDesalt({ enabled: v.target.checked, store: true })
                            )
                        }
                    >
                        Desalt
                    </Switch>
                </div>
            </div>
            <Footer />
        </div>
    );
}
