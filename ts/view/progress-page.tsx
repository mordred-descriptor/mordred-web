import * as React from "react";

import { Footer } from "./footer";
import { ProgressBar, ProgressBarProps } from "./progress-bar";

export interface ProgressViewProps extends ProgressBarProps {
    title: string;
}

export function ProgressView({ title, name, text, progress }: ProgressViewProps) {
    return (
        <div className="progress-page page centered">
            <div className="container">
                <h1 className="title">
                    {title}
                </h1>
                <ProgressBar {...{ name, text, progress }} />
            </div>

            <Footer />
        </div>
    );
}
