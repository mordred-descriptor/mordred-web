import * as React from "react";

export interface ProgressBarProps {
    name: string;
    text: string;
    progress: number;
}

export function ProgressBar({name, text, progress}: ProgressBarProps) {
    const p = progress * 100 + "%";
    return (
        <div className="bar-container">
            <div className="name">{name}</div>
            <div className="bar">
                <div className="bar-item" style={{width: p}}>{text}</div>
            </div>
        </div>
    );
}
