import * as classnames from "classnames";
import * as React from "react";
import {Column, SortDirectionType, Table, TableCellProps, TableHeaderProps} from "react-virtualized";
import {AutoSizer} from "react-virtualized/dist/es/AutoSizer";
import {splitNumAndExp} from "../../util/math";

import * as Action from "./action";
import {ResultState} from "./state";

import * as api from "../../api";
import * as Route from "../../route";
import {ViewState} from "../../util/dispatch";
import {Dropdown} from "../../view/dropdown";
import {Footer} from "../../view/footer";
import {LoadingView} from "../../view/loading-page";
import {ProgressView} from "../../view/progress-page";

function makeCell(v: number|null, i: number): React.ReactNode {
    if (v === null) {
        return <td key={i} className="NA">-</td>;
    }

    const fv = Math.round(v * 100) / 100;
    return <td key={i}>{fv}</td>;
}

function DescriptorTable({descriptorInfo}: {descriptorInfo: ResultState["descriptorInfo"]}) {
    const N: number = descriptorInfo.length;
    if (N === 0) {
        return null;
    }

    const names: React.ReactNode[] = new Array(N);
    const mins: React.ReactNode[] = new Array(N);
    const maxs: React.ReactNode[] = new Array(N);
    const means: React.ReactNode[] = new Array(N);
    const stds: React.ReactNode[] = new Array(N);

    descriptorInfo.forEach((v, i) => {
        names[i] = <th key={v.index}>{v.name}</th>;
        mins[i] = makeCell(v.min, v.index);
        maxs[i] = makeCell(v.max, v.index);
        means[i] = makeCell(v.mean, v.index);
        stds[i] = makeCell(v.std, v.index);
    });

    return (
        <div className="sticky-table-wrapper">
            <div className="sticky-table-scroller">
                <table className="table sticky">
                    <thead>
                        <tr>
                            <th>statistics</th>{names}
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>min</td>{mins}</tr>
                        <tr><td>max</td>{maxs}</tr>
                        <tr><td>mean</td>{means}</tr>
                        <tr><td>std</td>{stds}</tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

interface DownloadDropdownProps {
    active: boolean;
    onClickOutside: () => void;
    onButtonClick: () => void;
    csvUrl: string;
}

function DownloadDropdown({active, onClickOutside, onButtonClick, csvUrl}: DownloadDropdownProps) {
    return (
        <Dropdown
            active={active}
            onClickOutside={onClickOutside}
            buttonData={{tooltip: "Download"}}
            buttonProps={{
                className: "btn btn-link dropdown-toggle tooltip tooltip-right",
                onClick: onButtonClick,
                children: <i className="fa fa-lg fa-download"/>,
            }}
            disableOnClickOutside={!active}
            >
            <a href={csvUrl}>csv</a>
        </Dropdown>
    );
}

function headerRenderer({label, dataKey, sortBy, sortDirection, disableSort}: TableHeaderProps) {
    if (disableSort) {
        return <div>{label || dataKey}</div>;
    }
    if (sortBy !== dataKey) {
        return <div>{label || dataKey} <i className="sort-placeholder fa fa-sort"/></div>;
    }

    const sortClass = sortDirection === "ASC" ? "fa-sort-asc" : "fa-sort-desc";
    return <div>{label || dataKey} <i className={classnames("fa", sortClass)}/></div>;
}

function aggrCellRenderer({cellData}: TableCellProps) {
    if (cellData === null) {
        return <div className="data-NA">-</div>;
    }
    if (cellData === 0) {
        return <div className="data-zero">0.000</div>;
    }

    const [n, e] = splitNumAndExp(cellData, 4);
    if (e === 0) {
        return <div>{n.toPrecision(4)}</div>;
    } else {
        return <div>{n.toPrecision(4)} &times; 10<sup>{e}</sup></div>;
    }
}

function ResultMainView(state: ViewState<ResultState, Action.ResultAction>) {
    const aggrProps = {
        headerRenderer,
        cellRenderer: aggrCellRenderer,
        flexGrow: 1,
        width: 100,
    };

    return (
        <div className="result-page page centered">
            <div className="top-bar">
                <div className="filename">
                    <h2>{state.name}</h2>
                    <DownloadDropdown
                        active={state.downloadShown}
                        onClickOutside={() => state.dispatch(Action.SetDownloadShown(false))}
                        onButtonClick={() => state.dispatch(Action.SetDownloadShown(!state.downloadShown))}
                        csvUrl={`/api/calc/${state.id}.csv`}/>
                </div>

                <a href={`/file/${state.file_id}`} className="btn btn-link">Back</a>
            </div>

            <AutoSizer disableHeight>{({width}) => (
                <Table
                    className="table"
                    height={300}
                    rowHeight={50}
                    headerHeight={50}
                    rowCount={state.descriptorInfo.length}
                    width={width}
                    rowGetter={({index}) => state.descriptorInfo[index]}
                    sort={(v) => state.dispatch(Action.ChangeSort(v as any))}
                    sortBy={state.sortBy}
                    sortDirection={state.sortDirection}
                    >
                    <Column label="#" dataKey="index" headerRenderer={headerRenderer} width={40} minWidth={40}/>
                    <Column dataKey="name" disableSort headerRenderer={headerRenderer} flexGrow={1} width={100}/>
                    <Column dataKey="min" {...aggrProps} />
                    <Column dataKey="max" {...aggrProps} />
                    <Column dataKey="mean" {...aggrProps} />
                    <Column dataKey="std" {...aggrProps} />
                </Table>
            )}</AutoSizer>

            <Footer/>
        </div>
    );
}

export function ResultView(state: ViewState<ResultState, Action.ResultAction>) {
    if (state.notFound) {
        return (
            <div className="file-page page centered">
                <h2>ID not found</h2>
                <p>{state.id}</p>
            </div>
        );
    }

    if (state.id === null) {
        return <LoadingView/>;
    }

    if (!state.done) {
        const ratio = state.current / state.total;
        const parcent = Math.round(ratio * 10000) / 100;
        return <ProgressView
            title="Calculating ..."
            name={state.name || ""}
            text={`${parcent}% (${state.current}/${state.total})`}
            progress={ratio}/>;
    }

    return <ResultMainView {...state}/>;
}
