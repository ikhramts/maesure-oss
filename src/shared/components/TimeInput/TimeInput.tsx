import * as React from 'react'
import * as moment from 'moment'
import { Input } from 'antd'
import { parseTime } from 'shared/utils/time/parseTime'
import { minuteOfDay } from 'shared/utils/time/timeUtils'

export interface TimeInputProps {
    value: Date | TimeInputInvalidValue | null
    format: string

    className?: string
    id?: string
    placeholder?: string
    autoFocus?: boolean

    onChange: (value: Date | TimeInputInvalidValue | null) => void
    onUserInteracted?: () => void
}

export type TimeInputInvalidValue = string

export interface TimeInputState {
    valueText: string
}

export class TimeInput extends React.Component<TimeInputProps, TimeInputState> {
    constructor(props: TimeInputProps) {
        super(props)

        this.emitValue = this.emitValue.bind(this)
        this.emitUserInteracted = this.emitUserInteracted.bind(this)

        this.state = {
            valueText: valueTextFromProp(props.value, props.format),
        }
    }

    componentDidUpdate(oldProps: TimeInputProps) {
        const oldValue = oldProps.value
        const newValue = this.props.value
        const format = this.props.format

        if (TimeInput.timeOfDayChanged(oldValue, newValue)) {
            this.setState({ valueText: valueTextFromProp(newValue, format) })
        }
    }

    render() {
        const onChange = (evt:any) => {
            this.emitUserInteracted()
            this.setState({valueText: evt.target.value})
        }

        const props = this.props
        
        let className = "timeInput"
        if (props.className) {
            className += " " + props.className
        } 

        return <Input id={props.id} className={className}
             value={this.state.valueText} onChange={onChange}
             onBlur={this.emitValue} onPressEnter={this.emitValue}
             onFocus={this.emitUserInteracted}
             placeholder={props.placeholder}
             autoFocus={this.props.autoFocus}/>
    }

    // ================== Public utility functions ================
    static timeOfDayChanged(oldValue: Date | TimeInputInvalidValue | null,
        newValue: Date | TimeInputInvalidValue | null) : boolean {

        if (!newValue) {
            return !!oldValue
        }

        if (typeof (newValue) == 'string') {
            return typeof oldValue != 'string' || newValue != oldValue
        }

        // Past this point, typeof newValue == Date
        if (!moment.isDate(oldValue)) {
            return true
        }

        // We need to compare the times of day.
        const oldMinuteOfDay = minuteOfDay(oldValue)
        const newMinuteOfDay = minuteOfDay(newValue)
        return oldMinuteOfDay != newMinuteOfDay
    }

    //================ Private =================
    private emitValue() {
        this.emitUserInteracted()
        const initialValue = this.props.value
        const valueText = this.state.valueText
        const time = parseTime(valueText)

        if (time) {
            if (TimeInput.timeOfDayChanged(initialValue, time)) {
                this.props.onChange(time)
            }
            
        } else {
            if (TimeInput.timeOfDayChanged(initialValue, valueText)) {
                this.props.onChange(valueText)
            }
        }
    }

    private emitUserInteracted(evt?: any) {
        evt?.preventDefault?.()
        this.props.onUserInteracted?.()
    }
}

function valueTextFromProp(value: Date | TimeInputInvalidValue | null, format: string) : string {
    if (moment.isDate(value)) {
        return moment(value).format(format)
    } else if (!value) {
        return ""
    } else {
        return value
    }
}

