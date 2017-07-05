import * as className from "classnames";
import * as React from "react";
import { default as handleClickOutside, InjectedOnClickOutProps } from "react-onclickoutside";

import { Switch } from "../../view/switch";

export interface ConfigModalProps {
    shown: boolean;
    descriptors: string[];
    disabled: { [key: string]: boolean };

    onClickOutside: () => void;
    onChangeDesc: (name: string, enabled: boolean) => void;
    onChangeAll: (enabled: boolean) => void;
    onClick: () => void;
}

class ConfigModalContainerImpl extends React.Component<
    ConfigModalProps & InjectedOnClickOutProps,
    {}
> {
    public handleClickOutside(ev: any) {
        this.props.onClickOutside();
    }

    public render() {
        const { props } = this;

        let all = true;
        for (const desc of props.descriptors) {
            if (props.disabled[desc]) {
                all = false;
                break;
            }
        }

        const body = !props.descriptors
            ? props.descriptors === null
              ? <div className="toast toast-error">failed to load descriptor list</div>
              : <div className="loading" />
            : props.descriptors.map((d, i) =>
                  <Switch
                      key={i}
                      checked={!props.disabled[d]}
                      onChange={v => props.onChangeDesc(d, v.target.checked)}
                  >
                      {d}
                  </Switch>
              );

        return (
            <div className="modal-container">
                <div className="modal-header">
                    <div className="modal-title">Descriptor config</div>
                    <Switch checked={all} onChange={v => props.onChangeAll(v.target.checked)}>
                        all
                    </Switch>
                </div>

                <div className="modal-body">
                    {body}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={props.onClick}>
                        Close
                    </button>
                </div>
            </div>
        );
    }
}

const ConfigModalContainer = handleClickOutside<ConfigModalProps>(ConfigModalContainerImpl);

export class ConfigModal extends React.Component<ConfigModalProps, {}> {
    public render() {
        const { props } = this;

        return (
            <div className={className("modal descriptor-modal", { active: props.shown })}>
                <div className="modal-overlay" />
                <ConfigModalContainer disableOnClickOutside={!props.shown} {...props} />
            </div>
        );
    }
}
