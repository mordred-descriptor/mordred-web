import * as React from "react";

export function Switch(props: React.InputHTMLAttributes<HTMLInputElement>) {
    const children = props.children;

    return (
        <label className="form-switch">
            <input type="checkbox" {...{ ...props, children: null }} />
            <i className="form-icon" />
            {children}
        </label>
    );
}
