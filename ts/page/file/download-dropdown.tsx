import * as React from "react";

import {Dropdown} from "../../view/dropdown";

export interface DownloadDropdownProps {
    shown: boolean;
    onClickOutside: () => void;
    onButtonClick: () => void;
    id: string;
    children: React.ReactNode;
}

export function DownloadDropdown(props: DownloadDropdownProps) {
    return (
        <Dropdown
            active={props.shown}
            onClickOutside={props.onClickOutside}
            buttonData={{tooltip: "Download"}}
            buttonProps={{
                className: "btn btn-link dropdown-toggle tooltip tooltip-right",
                onClick: props.onButtonClick,
                children: <i className="fa fa-lg fa-download"/>,
            }}
            disableOnClickOutside={!props.shown}
            >
            {props.children}
        </Dropdown>
    );
}
