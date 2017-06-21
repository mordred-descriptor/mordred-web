declare module "ngl" {
    interface StageParameters {
        backgroundColor?: string;
    }

    interface LoaderParameters {
        ext?: string;
    }

    interface StructureRepresentationParameters {
        radiusType?: string;
    }

    class Component {
    }

    class RepresentationComponent extends Component {
    }

    class StructureComponent extends Component {
        public addRepresentation(type: string, params: StructureRepresentationParameters): RepresentationComponent;
    }

    class Stage {
        constructor(idOrElement: string|Element, params: StageParameters);
        public dispose(): void;
        public loadFile<C extends Component>(path: string|File|Blob, params: LoaderParameters): Promise<C>;
        public autoView(duration: number): void;
        public  removeAllComponents(type?: string): void;
        public handleResize(): void;
    }
}
