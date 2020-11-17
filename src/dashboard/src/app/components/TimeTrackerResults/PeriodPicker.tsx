import * as React from 'react'
import * as moment from 'moment'
import { GroupByType } from 'shared/model';
import { DatePicker, LocaleProvider } from 'antd';
import en_GB from 'antd/lib/locale-provider/en_GB'
import { RangePickerValue } from 'antd/lib/date-picker/interface';

export interface PeriodPickerProps {
    groupBy: GroupByType
    from: Date
    to: Date

    onChange: (newFrom: Date, newTo: Date) => void
}

export function PeriodPicker(props: PeriodPickerProps) {
    const groupBy = props.groupBy

    if (groupBy == GroupByType.DAY || groupBy == GroupByType.CUSTOM) {
        return <DailyPeriodPicker 
                    from={props.from} 
                    to={props.to} 
                    onChange={props.onChange}/>
    
    } else if (groupBy == GroupByType.WEEK || groupBy == GroupByType.MONTH) {
        return <WeeklyOrMonthPeriodPicker 
                    from={props.from} 
                    to={props.to} 
                    onChange={props.onChange}
                    groupBy={groupBy}/>
    } else {
        // Catch-all with graceful degradation.
        console.error(`PeriodPicker: Unrecognized groupBy type '${groupBy}'`)
        return <DailyPeriodPicker from={props.from} to={props.to} onChange={props.onChange}/>
    }
}

interface PeriodPickerImplProps {
    from: Date
    to: Date

    onChange: (newFrom: Date, newTo: Date) => void
}

function DailyPeriodPicker(props: PeriodPickerImplProps) {
    const onRangeSelected = (range: RangePickerValue) => {
        if (!range || range.length < 2) {
            return
        }

        let from = range[0]
        let to = range[1]

        if (!from || !to)
            return

        props.onChange(from.toDate(), to.toDate())
    }

    return <span>
        Between 

        <DatePicker.RangePicker value={[moment(props.from), 
                                        moment(props.to)]} 
                                format="YYYY-MM-DD" 
                                onChange={onRangeSelected}
                                allowClear={false} separator="—"/>
    </span>
}

interface PeriodPickerImplState {
    selectedFrom: Date
    selectedTo: Date

    fromError: boolean
    toError: boolean
}

class WeeklyOrMonthPeriodPicker 
extends React.Component<PeriodPickerProps, PeriodPickerImplState> {
    constructor(props: PeriodPickerProps) {
        super(props)

        this.onFromSeleceted = this.onFromSeleceted.bind(this)
        this.onToSeleceted = this.onToSeleceted.bind(this)

        this._fromPicker = React.createRef()
        this._toPicker = React.createRef()

        this.state = {
            selectedFrom: props.from,
            selectedTo: props.to,

            fromError: false,
            toError: false
        }
    }

    componentDidUpdate(oldProps: PeriodPickerProps) {
        const oldFrom = oldProps.from
        const newFrom = this.props.from

        const oldTo = oldProps.to
        const newTo = this.props.to

        const stateUpdate = {...this.state}
        let needToSetState = false

        if (oldFrom.getTime() != newFrom.getTime()) {
            stateUpdate.selectedFrom = newFrom
            stateUpdate.fromError = false
            stateUpdate.toError = false

            needToSetState = true
        }

        if (oldTo.getTime() != newTo.getTime()) {
            stateUpdate.selectedTo = newTo
            stateUpdate.fromError = false
            stateUpdate.toError = false

            needToSetState = true
        }

        if (needToSetState) {
            this.setState(stateUpdate)
        }
    }

    render() {
        const state = this.state
        const fromClass = state.fromError ? "error" : ""
        const toClass = state.toError ? "error" : ""

        if (this.props.groupBy == GroupByType.WEEK) {
            // Use locale en_GB to force the week to start on Monday.
            return <span className="weeklyPeriodPicker">Between weeks of 
                <LocaleProvider locale={en_GB}>
                    <DatePicker.WeekPicker 
                        className={fromClass}
                        value={moment(state.selectedFrom)}
                        format="YYYY-MM-DD"
                        locale=""
                        allowClear={false}
                        ref={this._fromPicker}
                        onChange={this.onFromSeleceted}
                    />
                </LocaleProvider>

                and 

                <LocaleProvider locale={en_GB}>
                    <DatePicker.WeekPicker 
                        className={toClass}
                        value={moment(state.selectedTo)}
                        format="YYYY-MM-DD"
                        allowClear={false}
                        ref={this._toPicker}
                        onChange={this.onToSeleceted}
                    />
                </LocaleProvider>
            </span>
        
        } else {
            return <span className="weeklyPeriodPicker">Between 
                <DatePicker.MonthPicker 
                    className={fromClass}
                    value={moment(state.selectedFrom)}
                    format="YYYY-MM"
                    allowClear={false}
                    ref={this._fromPicker}
                    onChange={this.onFromSeleceted}
                />

                and 

                <DatePicker.MonthPicker 
                    className={toClass}
                    value={moment(state.selectedTo)}
                    format="YYYY-MM"
                    allowClear={false}
                    ref={this._toPicker}
                    onChange={this.onToSeleceted}
                />
            </span>
        }

    }

    // ============== Private ==============
    // Has to be 'any' because in current TypeScript version
    // 'DatePicker.WeekPicker' cannot be used as a type.
    _fromPicker : any = null
    _toPicker : any = null

    private onFromSeleceted(value: moment.Moment) {
        const from = value.toDate()
        const to = this.state.selectedTo

        if (from.getTime() > to.getTime()) {
            this.setState({
                selectedFrom: from,
                fromError: false,
                toError: true
            })
            return
        }

        this.setState({
            selectedFrom: from,
            fromError: false,
            toError: false
        })
        
        this.props.onChange(from, to)
    }

    private onToSeleceted(value: moment.Moment) {
        const from = this.state.selectedFrom
        const to = value.toDate()

        if (from.getTime() > to.getTime()) {
            this.setState({
                selectedTo: to,
                fromError: true,
                toError: false
            })

            return
        }

        this.setState({
            selectedTo: to,
            fromError: false,
            toError: false
        })
        
        this.props.onChange(from, to)
    }
}
