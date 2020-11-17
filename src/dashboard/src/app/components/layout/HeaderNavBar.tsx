import * as React from 'react'
import { TimeTrackerProxy } from 'shared/time-tracking/TimeTrackerProxy'
import { Link, NavLink } from 'react-router-dom';
import { AccountType } from 'shared/model/AccountType';
import { User } from 'shared/model/User';
import { Dropdown, Menu, Icon, Avatar, Modal } from 'antd';
import { CrispLoader } from '../CrispLoader';

export interface HeaderNavBarProps {
    timeTracker: TimeTrackerProxy
}

export class HeaderNavBar extends React.Component<HeaderNavBarProps, {}> {
    render() {
        const user = this.props.timeTracker.user

        if (!user) {
            return null
        }

        if (user.accountType == AccountType.NONE) {
            return <NoAccountNav />
        }

        if ( user.accountType == AccountType.TEMPORARY) {
            return <TempAccountNav />
        }

        return <AccountDropdown {...user} />
    }
}

export function NoAccountNav() {
    return <nav className="mainNav">
        {/* <HashLink className="headerNavLink" to="/#pricing">Pricing</HashLink> */}
        <NavLink className="headerNavLink" to="/contact">Contact</NavLink>
        <a className="headerNavLink" href="/api/auth/login">Sign in</a>
        <Link className="headerNavLink highlight" to="/create-account">Create account</Link>
    </nav>
}

export function TempAccountNav() {
    const onClickForgetMe = (evt: any) => {
        evt.preventDefault()
        Modal.confirm({
            title: "Are you sure?",
            content: "This will remove all your data.",
            onOk: () => { window.location.replace("/api/try-it-out/forget-me") },
            //okText: "Yes",
            okType: "danger",
            //cancelText: "No",
            maskClosable: true,
        })
    }

    return <nav className="mainNav">
        <NavLink className="headerNavLink" exact to="/">Track time</NavLink>
        <NavLink className="headerNavLink" to="/contact">Contact</NavLink>
        <a className="headerNavLink" href="" onClick={onClickForgetMe}>Forget me</a>
        <a className="headerNavLink" href="/api/auth/login">Sign in</a>
        <NavLink className="headerNavLink highlight" to="/create-account">Create account</NavLink>
        <CrispLoader/>
    </nav>
}


export function AccountDropdown(user: User) {
    const menu = (
        <Menu>
            <Menu.Item key="0" className="menuHeader">
                <span className="smallFont">Signed in as</span><br/>
                { user.email }
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item key="1">
                <NavLink id="headerNavBar_accountMenu_accountSettings" to="/account-settings"><Icon type="setting" /> Account settings</NavLink> 
            </Menu.Item>
            <Menu.Item key="2">
                <a id="headerNavBar_accountMenu_logout" href="/api/auth/logout"><Icon type="logout" /> Log out</a>
            </Menu.Item>
        </Menu>
    )
    
    let startSubscruiptionLink : JSX.Element | null = null

    if (user.accountType == AccountType.PRO_TRIAL
        || user.accountType == AccountType.PRO_TRIAL_EXPIRED) {

        const remainingTrialDays = user.remainingTrialDays
        let remainingTrial = ""

        if (remainingTrialDays == 1) {
            remainingTrial = " - last trial day"
        } else if (remainingTrialDays > 1) {
            remainingTrial = ` - ${remainingTrialDays} days left`
        } else if (user.accountType == AccountType.PRO_TRIAL_EXPIRED) {
            remainingTrial = " - trial expired"
        }

        startSubscruiptionLink = <NavLink className="headerNavLink highlight" to="/enter-payment">
            Setup payment{ remainingTrial }
        </NavLink>
    }


    return <nav className="mainNav">
        <NavLink className="headerNavLink" exact to="/">Track time</NavLink>
        <NavLink className="headerNavLink" exact to="/apps">Apps</NavLink>
        <NavLink className="headerNavLink" to="/contact">Contact</NavLink>
        { startSubscruiptionLink }
        <Dropdown overlay={menu} trigger={['click']} placement="bottomRight">
            <a id="headerNavBar_accountMenu" className="ant-dropdown-link">
                <Avatar icon="user" src={user.picture ? user.picture : undefined}/> 
                <Icon type="down" />
            </a>
        </Dropdown>
        <CrispLoader/>
    </nav>
}

