import * as React from 'react';
import { ActionButton, Icon, PrimaryButton, Image, IIconProps } from '@fluentui/react'
import "./QuickStart.scss"
import { Commands } from './Commands'
import CLI from '../../media/teams.png'

export default class QuickStart extends React.Component<any, any>{
    constructor(props: any) {
        super(props);

        this.state = {
            currentStep: 1,
            m365Account: undefined,
            azureAccount: undefined,
            stepsDone: [false, false, false, false, false, false]
        }
    }

    componentDidMount() {
        window.addEventListener("message", this.receiveMessage, false);
    }

    render() {
        let m365AccountContent: (string | JSX.Element)[] | string;
        if (this.state.m365Account === undefined) {
            m365AccountContent = ["The Teams Toolkit requires a Microsoft 365 (Organizational Account) where Teams is running and has been registered.", <br />, "You can still experience making a Teams app by using a testing account from ", <a href="https://developer.microsoft.com/en-us/microsoft-365/dev-program">M365 Developer Program</a>, "."];
        } else {
            m365AccountContent = `You have successfully signed in with your M365 account (${this.state.m365Account}).`;
        }

        let azureAccountContent: (string | JSX.Element)[] | string;
        if (this.state.azureAccount === undefined) {
            azureAccountContent = ["The Teams Toolkit requires an Azure account and subscription to deploy the Azure resources for your project.", <br />, "You will not be charged without your further confirmation."];
        } else {
            azureAccountContent = `You have successfully signed in with your Azure account (${this.state.azureAccount}).`;
        }

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
                            expanded={this.state.currentStep === 1}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={1}
                            done={this.state.stepsDone[0]}
                             />
                        <GetStartedAction
                            title="2. Explore Teams Toolkit commands"
                            content="Open Command Palette (⇧⌘P) and type ‘Teamsfx’ to find all relevant commands or use Command Line Interface (CLI) to increase productivity. "
                            actionText="Display all CLI commands"
                            onAction={this.displayCliCommands}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(2); }}
                            expanded={this.state.currentStep === 2}
                            tip={["Tip: ", <a href="https://github.com/OfficeDev/TeamsFx/tree/main/packages/cli">Dowonload CLI reference</a>]}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={2}
                            done={this.state.stepsDone[1]} 
                            />
                        <GetStartedAction
                            title="3. Install Node.js"
                            content={["The toolkit cannot find Node.js (v.10.x) on your machine.", <br />, "As a fundamental runtime context for Teams app, Node.js (v.10.x) is required. Please install the appropriate version to run the Microsoft Teams Toolkit.", <br />, "Read more about ", <a href="http://npm.github.io/installation-setup-docs/installing/using-a-node-version-manager.html">managing Node.js versions</a>, "."]}
                            actionText="Download"
                            onAction={this.downloadNode}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(3); }}
                            expanded={this.state.currentStep === 3}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={3}
                            done={this.state.stepsDone[2]} 
                            />
                        <GetStartedAction
                            title="4. Prepare M365 account"
                            content={m365AccountContent}
                            actionText={this.state.m365Account === undefined ? "Sign in to M365" : undefined}
                            onAction={this.signinM365}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(4); }}
                            expanded={this.state.currentStep === 4}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={4}
                            done={this.state.stepsDone[3] || this.state.m365Account} 
                            />
                        <GetStartedAction
                            title="5. Prepare Azure account"
                            content={azureAccountContent}
                            actionText={this.state.azureAccount === undefined ? "Sign in to Azure" : undefined}
                            onAction={this.signinAzure}
                            secondaryActionText="Next"
                            onSecondaryAction={() => { this.onNextStep(5); }}
                            expanded={this.state.currentStep === 5}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={5}
                            done={this.state.stepsDone[4] || this.state.azureAccount} 
                            />
                        <GetStartedAction
                            title="6. Build your first Teams app from samples"
                            content={["Explore our sample apps to help you quickly get started with the Teams app concepts and code structures.", <br />, "Do you already have a clear idea of which Teams app to build? If so, create a new project from the scratch."]}
                            actionText="View all Samples"
                            onAction={this.viewAllSamples}
                            secondaryActionText="Create New Project"
                            onSecondaryAction={this.createNewProject}
                            expanded={this.state.currentStep === 6}
                            onCollapsedCardClicked={this.onCollapsedCardClicked}
                            step={6}
                            done={this.state.stepsDone[5]} 
                            />
                    </div>
                    <div className="stage">
                        {
                            this.state.currentStep === 1 && (
                                <video id="capabilitiesVideo">
                                    <source src="https://s3.amazonaws.com/codecademy-content/courses/React/react_video-fast.mp4"></source>
                                </video>
                            )
                        }
                        {
                            this.state.currentStep === 2 && (
                                <Image
                                    src={CLI}
                                />
                            )
                        }
                        {
                            this.state.currentStep === 3 && (
                                <Image
                                    src={CLI}
                                />
                            )
                        }
                        {
                            this.state.currentStep === 4 && (
                                <Image
                                    src={CLI}
                                />
                            )
                        }
                        {
                            this.state.currentStep === 5 && (
                                <Image
                                    src={CLI}
                                />
                            )
                        }
                        {
                            this.state.currentStep === 6 && (
                                <Image
                                    src={CLI}
                                />
                            )
                        }
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
            case 'azureAccountChange':
                this.setState({ azureAccount: event.data.data });
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

    createNewProject = () => {
        vscode.postMessage({
            command: Commands.CreateNewProject
        });
    }

    onCollapsedCardClicked = (step: number) => {
        this.setState({
            currentStep: step
        })
    }

    onWatchVideo = () => {
        const video = document.getElementById("capabilitiesVideo") as HTMLMediaElement;
        if(video && video.paused){
            video!.play();
        }

        let done = this.state.stepsDone;
        done[0] = true;
        this.setState({
            stepsDone: done
        });
    }

    displayCliCommands = () => {
        vscode.postMessage({
            command: Commands.DisplayCliCommands,
            data: "teams --help"
        });

        let done = this.state.stepsDone;
        done[1] = true;
        this.setState({
            stepsDone: done
        });
    }

    downloadNode = () => {
        vscode.postMessage({
            command: Commands.OpenExternalLink,
            data: "https://nodejs.org/en/"
        });

        let done = this.state.stepsDone;
        done[2] = true;
        this.setState({
            stepsDone: done
        });
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

    signinAzure = () => {
        vscode.postMessage({
            command: Commands.SigninAzure
        });

        let done = this.state.stepsDone;
        done[4] = true;
        this.setState({
            stepsDone: done
        });
    }

    viewAllSamples = () => {
        let done = this.state.stepsDone;
        done[5] = true;
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
                        {
                            this.props.done && (
                                <Icon style={{ color: "#0097FB" }} iconName="SkypeCircleCheck" className="action-icon" />
                            )
                        }
                        {
                            !this.props.done && (
                                <Icon style={{ color: "#3794FF" }} iconName="CircleRing" className="action-icon" />
                            )
                        }
                        <div className="action-title" style={{ color: "#FFFFFF" }}>{this.props.title}</div>
                    </div>
                    <div className="card-line action-content">{this.props.content}</div>
                    <div className="left-right-align">
                        <div className="left">
                            {
                                this.props.actionText && (
                                    <PrimaryButton
                                        onClick={this.props.onAction}
                                        text={this.props.actionText}
                                    />
                                )
                            }
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
                        {
                            this.props.done && (
                                <Icon style={{ color: "#0097FB" }} iconName="SkypeCircleCheck" className="action-icon" />
                            )
                        }
                        {
                            !this.props.done && (
                                <Icon style={{ color: "#606060" }} iconName="CircleRing" className="action-icon" />
                            )
                        }
                        <div className="action-title" style={{ color: "#CCCCCC" }}>{this.props.title}</div>
                    </div>
                </div>
            )
        }
    }

    onCollapseClicked = () => {
        this.props.onCollapsedCardClicked(this.props.step);
    }
}

