import * as ngl from "ngl";
import * as React from "react";

export interface MolViewerProps {
    backgroundColor?: string;
    src?: string|Blob|File;
    className?: string;
    loaderParams?: ngl.LoaderParameters;
}

export class MolViewer extends React.Component<MolViewerProps, {}> {
    private stage: ngl.Stage;
    private view: Element;
    private width: number;
    private height: number;
    private callback: () => void;

    public handleResize(): void {
        const newHeight = this.view.clientHeight;
        const newWidth = this.view.clientWidth;
        if (this.height === newHeight && this.width === newWidth) {
            return;
        }
        this.height = newHeight;
        this.width = newWidth;
        this.stage.handleResize();
    }

    public componentDidMount(): void {
        const view = this.refs.view as Element;
        this.stage = new ngl.Stage(view, {backgroundColor: this.props.backgroundColor});
        this.view = view;
        this.handleResize();
        this.callback = this.handleResize.bind(this);
        window.addEventListener("resize", this.callback);
    }

    public componentWillUpdate(nextProps: MolViewerProps, nextState: any) {
        if (this.props.src === nextProps.src) {
            return;
        }

        this.stage.handleResize();
        this.stage.removeAllComponents();
        if (nextProps.src) {
            this.stage.loadFile<ngl.StructureComponent>(nextProps.src, nextProps.loaderParams || {}).then((comp) => {
                comp.addRepresentation("ball+stick", {});
                this.stage.autoView(0);
            });
        }
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.callback);
    }

    public render() {
        return <div ref="view" className={this.props.className}/>;
    }
}
