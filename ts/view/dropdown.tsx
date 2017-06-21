import * as classnames from "classnames";
import * as React from "react";

import {default as handleClickOutside, InjectedOnClickOutProps, OnClickOutProps} from "react-onclickoutside";

export interface DropdownProps {
    onClickOutside: () => void;
    active: boolean;
    buttonProps: React.HTMLProps<HTMLButtonElement>;
    buttonData: {[key: string]: string};
    children: React.ReactNode[]|React.ReactNode;
}

class DropdownImpl extends React.Component<DropdownProps & InjectedOnClickOutProps, {}> {
    public handleClickOutside(ev: any) {
        this.props.onClickOutside();
    }

    public render() {
        const state = this.props;
        const btn: any = {...state.buttonProps};

        for (const key in state.buttonData) {
            if (!state.buttonData.hasOwnProperty(key)) {
                continue;
            }
            btn["data-" + key] = state.buttonData[key];
        }

        const children = Array.isArray(state.children) ? state.children : [state.children];

        return (
            <div className={classnames("dropdown", {active: state.active})}>
                <button {...btn}/>

                <ul className="menu">
                    {children.map((c, i) =>
                        <li className="menu-item" key={i}>
                            {c}
                        </li>,
                    )}
                </ul>
            </div>
        );
    }
}

export const Dropdown: React.ComponentClass<DropdownProps & OnClickOutProps> = handleClickOutside<DropdownProps>(DropdownImpl);
