import * as React from 'react'
import { AutoComplete, Input } from 'antd'
import { IResponseSuggestionService } from 'shared/time-tracking/IResponseSuggestionService'

export interface EntryTextAutocompleteProps {
    value: string
    className?: string
    id?: string
    responseSuggestionService: IResponseSuggestionService
    autoFocus?: boolean

    /**
     * Value of the input changed.
     */
    onChanged: (text: string) => void

    /**
     * When the user clicks on or types something into the
     * autocomplete.
     */
    onUserInteracted?: () => void

    /**
     * When the user selects from the drop-down.
     */
    onSelect: (text: string) => void

    /**
     * When user presses Enter in the text box.
     */
    onSubmit: () => void
}

export enum AutoCompleteState {
    TYPING_TEXT, SELECTING_FROM_LIST
}

export interface EntryTextAutocompleteState {
    autoCompleteSuggestions: string[]
    autoCompleteState: AutoCompleteState
}

export class EntryTextAutocomplete 
extends React.Component<EntryTextAutocompleteProps, EntryTextAutocompleteState> {
    constructor(props: EntryTextAutocompleteProps) {
        super(props)

        this.reloadSuggestions = this.reloadSuggestions.bind(this)

        this.state = {
            autoCompleteSuggestions: [],
            autoCompleteState: AutoCompleteState.TYPING_TEXT
        }
    }

    componentDidMount() {
        this.reloadSuggestions("")
    }

    componentWillUnmount() {
        this._unmounted = true
    }

    render() {
        const onUserInteracted = () => {
            this.props.onUserInteracted?.()
        }

        const onInputChanged = (value:any) => {
            const entryText = value as string
            this.props.onChanged(entryText)
            onUserInteracted()
            this.reloadSuggestions(entryText)
        }

        const onSelect = (value: any) => {
            onUserInteracted()
            this.props.onSelect("" + value)
        }

        const onKeyDown = (evt: React.KeyboardEvent) => {
            const autoCompleteState = this.state.autoCompleteState
            const keyCode = evt.keyCode

            if (autoCompleteState == AutoCompleteState.TYPING_TEXT) {
                // "Enter"
                if (keyCode == 13) {
                    evt.preventDefault()
                    this.props.onSubmit()
                }
            
                // "Up" or "Down"
                if (keyCode == 38 || keyCode == 40) {
                    this.setState({
                        autoCompleteState: AutoCompleteState.SELECTING_FROM_LIST
                    })
                }

            } else if (autoCompleteState == AutoCompleteState.SELECTING_FROM_LIST) {
                // Anything except arrows or alt/shift/ctrl/cmd
                if (keyCode != 38 && keyCode != 40 && keyCode != 16 && 
                    keyCode != 17 && keyCode != 18) {

                    this.setState({autoCompleteState: AutoCompleteState.TYPING_TEXT})
                }

            } else {
                throw "Unknown autoCompleteState: " + autoCompleteState
            }
        }

        const onClickOnTextInput = () => {
            onUserInteracted()
            this.setState({autoCompleteState: AutoCompleteState.TYPING_TEXT})
        }

        let className = "entryTextAutocompleteInput"

        if (this.props.className) {
            className = className + " " + this.props.className
        }

        return <AutoComplete 
                    value={this.props.value} 
                    autoFocus={this.props.autoFocus}
                    defaultActiveFirstOption={false}
                    onChange={onInputChanged}
                    dataSource={this.state.autoCompleteSuggestions} 
                    onSelect={onSelect}
                    defaultOpen={this.props.autoFocus}>

                <Input className={className} type="text" id={this.props.id}
                    onChange={onInputChanged} onKeyDown={onKeyDown} 
                    onMouseDown={onClickOnTextInput}/>
            </AutoComplete>

    }

    //================ Private ====================
    private _unmounted: boolean = false

    private reloadSuggestions(responseText: string) {
        this.props.responseSuggestionService.suggestResponses(responseText)
        .then(suggestions => {
            if (this._unmounted) {
                return
            }

            if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
                this.setState({autoCompleteSuggestions: suggestions})
            } else {
                this.setState({autoCompleteSuggestions: []})
            }
        })
    }
}