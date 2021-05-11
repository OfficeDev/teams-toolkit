import * as React from 'react';
import { Icon, Stack, Image, PrimaryButton } from '@fluentui/react'
import './SampleGallery.scss'
import { Commands } from './Commands'
import HelloWorld from '../../media/helloworld.gif'

export default class SampleGallery extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
    }

    componentDidMount() {
        window.addEventListener("message", this.receiveMessage, false);
    }

    render() {
        return(
            <div className="sample-gallery">
                <div className="section" id="title">
                    <div className="logo">
                        <Icon iconName="Heart" className="logo" />
                    </div>
                    <div className="title">
                        <h2>Samples</h2>
                        <h3>Explore our samples to help you quickly get started with the basic Teams app concepts and code structures.</h3>
                    </div>
                </div>
                <Stack
                    className="sample-stack"
                    horizontal
                    verticalFill
                    wrap
                    horizontalAlign={'start'}
                    verticalAlign={'start'}
                    styles={{root:{overflow: "visible"}}}
                    tokens={{childrenGap: 20}}>
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="To Do List"
                        description="Sample app description goes here"
                        sampleAppName="To Do List"
                        sampleAppUrl="https://github.com/HuihuiWu-Microsoft/Sample-app-graph/releases/download/v1.0/sample.app.graph.zip"/>
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="Sample app title goes here"
                        description="Sample app description goes here" />
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="Sample app title goes here"
                        description="Sample app description goes here" />
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="Sample app title goes here"
                        description="Sample app description goes here" />
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="Sample app title goes here"
                        description="Sample app description goes here" />
                    <SampleAppCard
                        image={HelloWorld}
                        tags={["Launch Page", "TS"]}
                        title="Sample app title goes here"
                        description="Sample app description goes here" />
                </Stack>
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
}

class SampleAppCard extends React.Component<any, any>{
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <div className="sample-app-card">
                <Image 
                src={this.props.image} width={278} height={160}/>
                <div className="section">
                    {
                        this.props.tags && (
                            this.props.tags.map((value: string) => {
                                return <p className="tag">{value}</p>
                            })
                        )
                    }
                </div>
                <h2>{this.props.title}</h2>
                <h3>{this.props.description}</h3>
                <div className="section buttons">
                    <PrimaryButton 
                        text="Clone"
                        className="right-aligned"
                        onClick={() =>{this.cloneSampleApp(this.props.sampleAppName, this.props.sampleAppUrl)}}/>
                    <PrimaryButton
                        style={{display: "none"}}
                        text="Preview" />
                </div>
            </div>
        )
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
}

