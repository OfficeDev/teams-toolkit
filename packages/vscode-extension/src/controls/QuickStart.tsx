import * as React from 'react';
import { ActionButton, Icon, PrimaryButton, Image, IIconProps } from '@fluentui/react'
import "./QuickStart.scss"
import { Commands } from './Commands'
import CLI from '../../media/teams.png'

export default class QuickStart extends React.Component<any, any>{
    constructor(props: any) {
        super(props);

    }

    componentDidMount() {
        window.addEventListener("message", this.receiveMessage, false);
    }

    render() {

        return (
            <div className="quick-start-page">
                <div className="section">
                    <div className="logo">
                        <Icon iconName="LightningBolt" className="logo" />
                    </div>
                    <div className="title">
                        <h2>Quick Start</h2>
                        <h3 className="text">Jumpstart your Teams app development experience</h3>
                    </div>
                </div>
                <div className="flex-section">
                    <div className="table-of-contents">
                        <GetStartedAction
                            title="1. What are Teams app 'Capabilities'?"
                            content={[<a href="https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/capabilities-overview">Capabilities</a>, " are the extension points for building apps on the Microsoft Teams platform."]}
                            actionText="Watch Video (1 min)"
                            onAction={this.onWatchVideo}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(1); }}
                             />
                        <GetStartedAction
                            title="2. Explore Teams Toolkit commands"
                            content="Open Command Palette (⇧⌘P) and type ‘Teamsfx’ to find all relevant commands or use Command Line Interface (CLI) to increase productivity. "
                            actionText="Display all CLI commands"
                            onAction={this.displayCliCommands}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(2); }}
                            />
                        <GetStartedAction
                            title="3. Install Node.js"
                            content={["The toolkit cannot find Node.js (v.10.x) on your machine.", <br />, "As a fundamental runtime context for Teams app, Node.js (v.10.x) is required. Please install the appropriate version to run the Microsoft Teams Toolkit.", <br />, "Read more about ", <a href="http://npm.github.io/installation-setup-docs/installing/using-a-node-version-manager.html">managing Node.js versions</a>, "."]}
                            actionText="Download"
                            onAction={this.downloadNode}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(3); }}
                            />
                        <GetStartedAction
                            title="4. Prepare M365 account"
                            content={m365AccountContent}
                            actionText={this.state.m365Account === undefined ? "Sign in to M365" : undefined}
                            onAction={this.signinM365}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(4); }}
                            />
                        <GetStartedAction
                            title="5. Prepare Azure account"
                            content={azureAccountContent}
                            actionText={this.state.azureAccount === undefined ? "Sign in to Azure" : undefined}
                            onAction={this.signinAzure}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(5); }}
                            />
                        <GetStartedAction
                            title="6. Build your first Teams app from samples"
                            content={["Explore our sample apps to help you quickly get started with the Teams app concepts and code structures.", <br />, "Do you already have a clear idea of which Teams app to build? If so, create a new project from the scratch."]}
                            actionText="View all Samples"
                            onAction={this.viewAllSamples}
                            />
                    </div>
                    <div className="stage">
                    </div>
                </div>
            </div>
        )
    }

    receiveMessage = (event: any) => {
        const message = event.data.message;
        console.log(`Received message: ${JSON.stringify(message)}`);

        switch (message) {
            case 'm365AccountChange':
                this.setState({ m365Account: event.data.data });
                break;
            default:
                break;
        }
    }

    onNextStep = (step: number) => {
        this.setState({
            currentStep: step + 1
        });
    }

    onWatchVideo = () => {
    }

    displayCliCommands = () => {
        vscode.postMessage({
            command: Commands.DisplayCliCommands,
            data: "teams --help"
        });
    }

    downloadNode = () => {
    }

    signinM365 = () => {
        vscode.postMessage({
            command: Commands.SigninM365
        });

        let done = this.state.stepsDone;
        done[3] = true;
        this.setState({
            stepsDone: done
        });
    }
}

class GetStartedAction extends React.Component<any, any>{
    constructor(props: any) {
        super(props);
    }

    render() {
        if (this.props.expanded) {
            return (
                <div className="action-card">
                    <div className="flex-section card-line">
                        <div className="action-title" style={{ color: "#FFFFFF" }}>{this.props.title}</div>
                    </div>
                    <div className="card-line action-content">{this.props.content}</div>
                    <div className="left-right-align">
                        <div className="left">
                        </div>
                        <div className="right">
                            <ActionButton
                                onClick={this.props.onSecondaryAction}
                                text={this.props.secondaryActionText}
                            />
                        </div>
                    </div>
                    <div className="tip">
                        {this.props.tip}
                    </div>
                </div>
            );
        } else {
            return (
                <div className="collapse-action-card"
                    onClick={this.onCollapseClicked}>
                    <div className="flex-section">
                        <div className="action-title" style={{ color: "#CCCCCC" }}>{this.props.title}</div>
                    </div>
                </div>
            )
    }
    }

    }
    }
