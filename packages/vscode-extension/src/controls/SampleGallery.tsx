import * as React from "react";
import { Icon, Stack, Image, PrimaryButton, Label } from "@fluentui/react";
import "./SampleGallery.scss";
import { Commands } from "./Commands";
import FAQPlus from "../../media/faq-plus.gif";
import InMeetingApp from "../../media/in-meeting-app.png";
import ShareNow from "../../media/share-now.gif";
import ToDoList from "../../media/to-do-list.gif";
import ToDoListSharepoint from "../../media/to-do-list-sharepoint.gif";
import ToDoListM365 from "../../media/to-do-list-M365.gif";
import NpmSearchConnectorM365 from "../../media/npm-search-connector-M365.gif";
import HelloWorldTab from "../../media/helloWorld-tab.gif";
import HelloWorldTabWithBackend from "../../media/helloWorld-tab-with-backend.gif";
import HelloWorldBot from "../../media/helloWorld-bot.gif";
import Watch from "../../media/watch.svg";
import Settings from "../../media/settings.svg";
import GraphToolkitContactExporter from "../../media/graph-toolkit-contact-exporter.gif";
import { EventMessages } from "./messages";

interface SampleInfo {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  tags: string[];
  time: string;
  configuration: string;
  link: string;
}

interface SampleCollection {
  baseUrl: string;
  samples: SampleInfo[];
}

const imageMapping: { [p: string]: any } = {
  "todo-list-with-Azure-backend": ToDoList,
  "todo-list-SPFx": ToDoListSharepoint,
  "share-now": ShareNow,
  "in-meeting-app": InMeetingApp,
  "faq-plus": FAQPlus,
  "todo-list-with-Azure-backend-M365": ToDoListM365,
  "NPM-search-connector-M365": NpmSearchConnectorM365,
  "hello-world-tab": HelloWorldTab,
  "hello-world-tab-with-backend": HelloWorldTabWithBackend,
  "graph-toolkit-contact-exporter": GraphToolkitContactExporter,
  "hello-world-bot": HelloWorldBot,
};

export default class SampleGallery extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      baseUrl: "",
      samples: [],
    };
  }

  componentWillMount() {
    window.addEventListener("message", this.receiveMessage, false);
    this.loadSampleCollection();
  }

  loadSampleCollection() {
    vscode.postMessage({
      command: Commands.LoadSampleCollection,
    });
  }

  render() {
    return (
      <div className="sample-gallery">
        <div className="section" id="title">
          <div className="logo">
            <Icon iconName="Heart" className="logo" />
          </div>
          <div className="title">
            <h2>Samples</h2>
            <h3>Explore our sample apps to quickly get started with concepts and code examples.</h3>
          </div>
        </div>
        <Stack
          className="sample-stack"
          horizontal
          verticalFill
          wrap
          horizontalAlign={"start"}
          verticalAlign={"start"}
          styles={{ root: { overflow: "visible" } }}
          tokens={{ childrenGap: 20 }}
        >
          <SampleAppCardList samples={this.state.samples} baseUrl={this.state.baseUrl} />
        </Stack>
      </div>
    );
  }

  receiveMessage = (event: any) => {
    const message = event.data.message;
    switch (message) {
      case EventMessages.LoadSampleCollection:
        const sampleCollection = event.data.data as SampleCollection;
        this.setState({
          baseUrl: sampleCollection.baseUrl,
          samples: sampleCollection.samples,
        });
        break;
      default:
        break;
    }
  };
}

class SampleAppCardList extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
  }

  render() {
    const samples = this.props.samples as Array<SampleInfo>;
    if (samples) {
      const baseUrl = this.props.baseUrl;
      return samples.map((sample) => {
        return (
          <SampleAppCard
            baseUrl={baseUrl}
            image={imageMapping[sample.id]}
            tags={sample.tags}
            time={sample.time}
            configuration={sample.configuration}
            title={sample.title}
            description={sample.fullDescription}
            sampleAppFolder={sample.id}
            sampleAppUrl={sample.link}
          />
        );
      });
    }
  }
}

class SampleAppCard extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
  }

  render() {
    return (
      <div className="sample-app-card" tabIndex={0}>
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          sample app card
        </label>
        <Image src={this.props.image} width={278} height={160} />
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
          id="tagLabel"
        >
          sample app tags:
        </label>
        <div className="section" aria-labelledby="tagLabel">
          {this.props.tags &&
            this.props.tags.map((value: string) => {
              return <p className="tag">{value}</p>;
            })}
        </div>
        <div className="estimation-time">
          <Image
            src={Watch}
            width={16}
            height={16}
            style={{ marginTop: "auto", marginBottom: "auto" }}
          ></Image>

          <label style={{ paddingLeft: 4 }}>{this.props.time}</label>
        </div>
        <div className="configuration">
          <Image
            src={Settings}
            width={16}
            height={16}
            style={{ marginTop: "auto", marginBottom: "auto" }}
          ></Image>
          <label style={{ paddingLeft: 4 }}>{this.props.configuration}</label>
        </div>
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
          id="titleLabel"
        >
          sample app title:
        </label>
        <h2>{this.props.title}</h2>
        <label
          style={{
            position: "absolute",
            top: "auto",
            left: -9999,
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
          id="descriptionLabel"
        >
          sample app description:
        </label>
        <h3>{this.props.description}</h3>
        <div className="section buttons">
          <PrimaryButton
            text="View on Github"
            className="right-aligned"
            onClick={() => {
              this.viewSampleApp(this.props.sampleAppFolder, this.props.baseUrl);
            }}
          />
          <PrimaryButton
            text="Create"
            className="right-aligned"
            onClick={() => {
              this.cloneSampleApp(
                this.props.title,
                this.props.sampleAppUrl,
                this.props.sampleAppFolder
              );
            }}
          />
        </div>
      </div>
    );
  }

  cloneSampleApp = (sampleAppName: string, sampleAppUrl: string, sampleAppFolder: string) => {
    vscode.postMessage({
      command: Commands.CloneSampleApp,
      data: {
        appName: sampleAppName,
        appUrl: sampleAppUrl,
        appFolder: sampleAppFolder,
      },
    });
  };

  viewSampleApp = (sampleAppFolder: string, sampleBaseUrl: string) => {
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: sampleBaseUrl + sampleAppFolder,
    });
  };
}
