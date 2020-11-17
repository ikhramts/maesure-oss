import * as React from 'react'
import { ApiClient } from 'shared/api/ApiClient';
import { User } from 'shared/model/User';

export interface ApiTestProps {
    apiClient: ApiClient
}

export interface ApiTestState {
    user: User | null
}

export class ApiTest extends React.Component<ApiTestProps, ApiTestState> {
    constructor(props: ApiTestProps) {
        super(props)

        this.state = {
            user: null
        }
    }

    componentDidMount() {
        this.props.apiClient.fetchCurrentUser()
            .then(user => this.setState({user: user}))
    }

    render() {
        const user = this.state.user

        if (user) {
            return <p>Email: { user.email || 'null' }</p>
        } else {
            return <p>User has not loaded</p>
        }
    }
}