import * as React from "react";
import { Icon, Stack, Image, FontIcon } from "@fluentui/react";
import { VSCodeButton, VSCodeTag } from "./webviewUiToolkit";
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
import { Watch, Setting } from "./resources";
import GraphToolkitContactExporter from "../../media/graph-toolkit-contact-exporter.gif";
import BOTSSO from "../../media/bot-sso.gif";
import { EventMessages } from "./messages";
import SampleDetailPage from "./sampleDetailPage";

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
  "bot-sso": BOTSSO,
};

export default class SampleGallery extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      baseUrl: "",
      samples: [],
      highlightSample: "",
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
    const samples = this.state.samples as Array<SampleInfo>;
    const hightSample = samples.filter(
      (sample: SampleInfo) => sample.id == this.state.highlightSample
    )[0];
    return (
      <div>
        {this.state.highlightSample == "" && (
          <div className="sample-gallery">
            <div className="section" id="title">
              <div className="logo">
                <Icon iconName="Library" className="logo" />
              </div>
              <div className="title">
                <h2>Samples</h2>
                <h3>
                  Explore our sample apps to quickly get started with concepts and code examples.
                </h3>
              </div>
            </div>
            <div className="sample-stack">
              <SampleAppCardList
                samples={this.state.samples}
                baseUrl={this.state.baseUrl}
                highlightSample={this.highlightSample}
              />
            </div>
          </div>
        )}
        {this.state.highlightSample != "" && (
          <SampleDetailPage
            baseUrl={this.state.baseUrl}
            image={imageMapping[hightSample.id]}
            tags={hightSample.tags}
            time={hightSample.time}
            configuration={hightSample.configuration}
            title={hightSample.title}
            description={hightSample.fullDescription}
            sampleAppFolder={hightSample.id}
            sampleAppUrl={hightSample.link}
            highlightSample={this.highlightSample}
          ></SampleDetailPage>
        )}
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

  highlightSample = (id: string) => {
    this.setState({
      highlightSample: id,
    });
  };
}

class SampleAppCardList extends React.Component<SampleListProps, any> {
  constructor(props: SampleListProps) {
    super(props);
  }

  render() {
    const samples = this.props.samples as Array<SampleInfo>;
    if (samples) {
      const baseUrl = this.props.baseUrl;
      return samples.map((sample, index) => {
        return (
          <SampleCard
            baseUrl={baseUrl}
            image={imageMapping[sample.id]}
            tags={sample.tags}
            time={sample.time}
            configuration={sample.configuration}
            title={sample.title}
            description={sample.fullDescription}
            sampleAppFolder={sample.id}
            sampleAppUrl={sample.link}
            suggested={sample.suggested}
            order={index + 1}
            highlightSample={this.props.highlightSample}
          />
        );
      });
    }
  }
}

class SampleCard extends React.Component<SampleCardProps, any> {
  constructor(props: SampleCardProps) {
    super(props);
  }

  render() {
    return (
      <div
        className={`sample-card box${this.props.order}`}
        tabIndex={0}
        onClick={() => {
          this.props.highlightSample(this.props.sampleAppFolder);
        }}
      >
        {this.props.suggested && (
          <div className="triangle">
            <FontIcon iconName="FavoriteStar" className="star"></FontIcon>
          </div>
        )}
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
        <Image src={this.props.image} />
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
              return <VSCodeTag className="tag">{value}</VSCodeTag>;
            })}
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
        <div className="estimation-time">
          <div className="watch">
            <Watch></Watch>
          </div>
          <label style={{ paddingLeft: 4 }}>{this.props.time}</label>
        </div>
        <div className="configuration">
          <div className="setting">
            <Setting></Setting>
          </div>
          <label style={{ paddingLeft: 4 }}>{this.props.configuration}</label>
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
