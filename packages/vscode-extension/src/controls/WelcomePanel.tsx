import * as React from 'react';
import "./WelcomePanel.scss"
import { ActionButton, TooltipHost, ProgressIndicator, IconButton, Icon } from '@fluentui/react'
import { Commands } from './Commands'
interface CardState{
    show: boolean;
    showCancel: boolean
}

interface IWelcomePanelState{
    learnToolkit: CardState;
    buildApp: CardState;
    showGettingStarted: boolean;
}

export default class WelcomePanel extends React.Component<any, IWelcomePanelState> {
    constructor(props: any){
        super(props);

        this.state = {
            learnToolkit: {show: true, showCancel: false},
            buildApp: { show: true, showCancel: false },
            showGettingStarted: true,
        }
    }

    componentDidMount() {
        window.addEventListener("message", this.receiveMessage, false);
    }

    render(){
        return (
            <div className="welcome-page">
                <div className="section">
                    <div className="logo">
                        <Icon style={{ color: "#8B8CC7", fontSize: 30}} iconName="TeamsLogo" className="logo"/>
                    </div>
                    <div className="title">
                        <h2>Microsoft Teams Toolkit</h2>
                        <h3 className="text">Create apps and extensions for Microsoft Teams (
                            <a href='www.baidu.com'>v.2.0</a>).
                        </h3>
                    </div>
                </div>
                <div className="section">
                    {
                        this.state.showGettingStarted && (
                    <div className="getting-started">
                        <div className="content-header">
                            <p className="text">Get Started</p>
                        </div>
                        {
                            this.state.learnToolkit.show && (
                                <div
                                    className="get-started-card"
                                    onMouseEnter={this.showCancelLearnToolkitCard}
                                    onMouseLeave={this.hideCancelLearnToolkitCard}
                                    onClick={this.navigateToLearnToolkit}>
                                    <Icon style={{ color: "#3794FF", fontSize: 24, width: 24, height: 24 }} iconName="lightbulb" className="icon" />
                                    <div className="card-body">
                                        <h2>Learn about the Toolkit</h2>
                                        <h3>Understand the Teams Toolkit fundamentals</h3>
                                        <ProgressIndicator
                                            label="3 items"
                                            barHeight={6}
                                            styles={{
                                                progressBar: {
                                                    borderRadius: 6,
                                                    backgroundColor: '#3794FF'
                                                },
                                                progressTrack: {
                                                    borderRadius: 6,
                                                    paddingTop: 0,
                                                    paddingBottom: 0
                                                },
                                                itemName: {
                                                    color: '#808080',
                                                    fontSize: 11,
                                                    lineHeight: 11,
                                                    paddingBottom: 4,
                                                    paddingTop: 0
                                                },
                                                itemProgress: {
                                                    borderRadius: 6,
                                                    paddingTop: 0,
                                                    paddingBottom: 0
                                                }
                                            }} />
                                    </div>
                                    {
                                        this.state.learnToolkit.showCancel && (
                                            <div>
                                                <IconButton
                                                    iconProps={{ iconName: 'Cancel' }}
                                                    style={{ backgroundColor: 'transparent', color: '#FFFFFF', width: 16, height: 16, margin: 0, padding: 0 }}
                                                    onClick={this.closeLearnToolkitCard }
                                                >
                                                </IconButton>
                                            </div>
                                        )
                                    }
                                </div>
                            )
                        }
                        {
                            this.state.buildApp.show && (
                                <div
                                    className="get-started-card"
                                    onMouseEnter={this.showCancelBuildAppCard}
                                    onMouseLeave={this.hideCancelBuildAppCard}>
                                    <Icon style={{ color: "#3794FF", fontSize: 24, width: 24, height: 24 }} iconName="lightbulb" className="icon" />
                                    <div className="card-body">
                                        <h2>Build your first Teams app</h2>
                                        <h3>Prepare your environment and build a Hello World from samples</h3>
                                        <ProgressIndicator
                                            label="3 items"
                                            barHeight={6}
                                            styles={{
                                                progressBar: {
                                                    borderRadius: 6,
                                                    backgroundColor: '#3794FF'
                                                },
                                                progressTrack: {
                                                    borderRadius: 6,
                                                    paddingTop: 0,
                                                    paddingBottom: 0
                                                },
                                                itemName: {
                                                    color: '#808080',
                                                    fontSize: 11,
                                                    lineHeight: 11,
                                                    paddingBottom: 4,
                                                    paddingTop: 0
                                                },
                                                itemProgress: {
                                                    borderRadius: 6,
                                                    paddingTop: 0,
                                                    paddingBottom: 0
                                                }
                                            }} />
                                    </div>
                                    {
                                        this.state.buildApp.showCancel && (
                                            <div>
                                                <IconButton
                                                    iconProps={{ iconName: 'Cancel' }}
                                                    style={{ backgroundColor: 'transparent', color: '#FFFFFF', width: 16, height: 16, margin: 0, padding: 0 }}
                                                    onClick={this.closeBuildAppCard}
                                                >
                                                </IconButton>
                                            </div>
                                        )
                                    }
                                </div>
                            )
                        }
                    </div>
                        )
                    }
                    <div className="content">
                        <div className="content-block">
                            <div className="content-header">
                                <p className="text">Samples</p>
                                <div>
                                    <ActionButton>
                                        View all Samples
                                    </ActionButton>
                                </div>
                            </div>
                            <div className="content-item">
                                <div>
                                    <TooltipHost
                                        content="This blank app combines all capabilities: tab, conversational bot and messaging extension. A great starting poing if you would like to play around the full potential of Teams app capabilities"
                                        tooltipProps={{
                                            styles:{
                                                content: { color: '#CCCCCC'}
                                            }
                                        }}
                                        calloutProps={{
                                            backgroundColor: '#333333', calloutMaxWidth: 250, styles: {
                                                beak: { background: '#333333' },
                                                beakCurtain: { background: '#333333' },
                                                calloutMain: { background: '#333333' }
                                            }}}>
                                        <ActionButton
                                            iconProps={{ iconName: 'Link' }}
                                            onClick={() => {
                                                this.cloneSampleApp("To Do List", "https://github.com/HuihuiWu-Microsoft/Sample-app-graph/releases/download/v1.0/sample.app.graph.zip")
                                            }}>
                                            Blank app
                                        </ActionButton>
                                    </TooltipHost>
                                </div>
                                <p className="tag">Tab</p>
                                <p className="tag">TS</p>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}>
                                        Goal Tracker
                                    </ActionButton>
                                </div>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}>
                                        Contact Group Look Up
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                        <div className="content-block">
                            <div className="content-header">
                                <p className="text">Documentation</p>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}
                                        onClick={() => {this.openExternalLink('https://review.docs.microsoft.com')}}>
                                        Teams app fundamentals
                                    </ActionButton>
                                </div>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}>
                                        Teams Toolkit Command Line Interface (CLI) reference
                                    </ActionButton>
                                </div>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}
                                        onClick={() => { this.openExternalLink('https://developer.microsoft.com/en-us/fluentui#/controls')}}>
                                        Basic Fluent UI components
                                    </ActionButton>
                                </div>
                            </div>
                            <div className="content-item">
                                <div>
                                    <ActionButton
                                        iconProps={{ iconName: 'Link' }}
                                        onClick={() => { this.openExternalLink('https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema')}}>
                                        Manifest file schema for Microsoft Teams
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    receiveMessage = (event: any) => {
        const message = event.data.message;

        switch (message) {
            default:
                break;
        }
    }

    showCancelLearnToolkitCard = () => {
        const showCard = this.state.learnToolkit.show;
        this.setState({
            learnToolkit: { show: showCard, showCancel: true}
        });
    }

    hideCancelLearnToolkitCard = () => {
        const showCard = this.state.learnToolkit.show;
        this.setState({
            learnToolkit: { show: showCard, showCancel: false }
        });
    }

    showCancelBuildAppCard = () => {
        const showCard = this.state.buildApp.show;
        this.setState({
            buildApp: { show: showCard, showCancel: true }
        });
    }

    hideCancelBuildAppCard = () => {
        const showCard = this.state.buildApp.show;
        this.setState({
            buildApp: { show: showCard, showCancel: false }
        });
    }

    closeLearnToolkitCard = ()=>{
        const showAnotherCard = this.state.buildApp.show;
        this.setState({
            learnToolkit: { show: false, showCancel: false },
            showGettingStarted: showAnotherCard
        })
    }

    closeBuildAppCard = () => {
        const showAnotherCard = this.state.learnToolkit.show;
        this.setState({
            buildApp: { show: false, showCancel: false },
            showGettingStarted: showAnotherCard
        })
    }

    openExternalLink = (link: string)=>{
        vscode.postMessage({
            command: Commands.OpenExternalLink,
            data: link
        })
    }

    cloneSampleApp = (sampleAppName: string, sampleAppUrl: string) => {
        vscode.postMessage({
            command: Commands.CloneSampleApp,
            data: {
                appName: sampleAppName,
                appUrl: sampleAppUrl
            }
        })
    }

    navigateToLearnToolkit = () => {
        this.props.history.push('/learn-toolkit');
    }
}