import * as React from "react";
import { Icon, Stack, Image, FontIcon } from "@fluentui/react";
import { VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import "./SampleGallery.scss";
import { Commands } from "./Commands";
import { SampleCardProps, SampleCollection, SampleInfo, SampleListProps } from "./ISamples";
import InMeetingApp from "../../img/webview/sample/in-meeting-app.png";
import ShareNow from "../../img/webview/sample/share-now.gif";
import ToDoList from "../../img/webview/sample/to-do-list.gif";
import ToDoListSharepoint from "../../img/webview/sample/to-do-list-sharepoint.gif";
import ToDoListM365 from "../../img/webview/sample/to-do-list-M365.gif";
import NpmSearchConnectorM365 from "../../img/webview/sample/npm-search-connector-M365.gif";
import HelloWorldTabWithBackend from "../../img/webview/sample/helloWorld-tab-with-backend.gif";
import { Watch, Setting } from "./resources";
import GraphToolkitContactExporter from "../../img/webview/sample/graph-toolkit-contact-exporter.gif";
import GraphToolkitOneProductivityHub from "../../img/webview/sample/graph-toolkit-one-productivity-hub.gif";
import BOTSSO from "../../img/webview/sample/bot-sso.gif";
import { EventMessages } from "./messages";
import SampleDetailPage from "./sampleDetailPage";
import GraphConnector from "../../img/webview/sample/graph-connector-app.gif";
import IncomingWebhook from "../../img/webview/sample/incoming-webhook.gif";
import AdaptiveCardNotification from "../../img/webview/sample/adaptive-card-notification.gif";
import SendProactiveMsg from "../../img/webview/sample/send-proactive-messages.gif";
import StockUpdate from "../../img/webview/sample/stock-update.gif";
import MsgExtSSO from "../../img/webview/sample/message-extension-sso.gif";
import VideoFilterApp from "../../img/webview/sample/video-filter-app-sample-in-test-app.gif";
import DashboardTab from "../../img/webview/sample/team-central-dashboard.gif";
import TeamsTabAndOutlookAddin from "../../img/webview/sample/hello-world-teams-tab-and-outlook-add-in.png";
import OutlookSetSignatureAddin from "../../img/webview/sample/outlook-set-signature-overview.png";
import DevAssistDashboard from "../../img/webview/sample/dev-assist-dashboard.png";
import LiveShareDiceRoller from "../../img/webview/sample/live-share-dice-roller.gif";
import TeamsChef from "../../img/webview/sample/teams-chef.gif";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";

const imageMapping: { [p: string]: any } = {
  "todo-list-with-Azure-backend": ToDoList,
  "todo-list-SPFx": ToDoListSharepoint,
  "share-now": ShareNow,
  "hello-world-in-meeting": InMeetingApp,
  "todo-list-with-Azure-backend-M365": ToDoListM365,
  "NPM-search-connector-M365": NpmSearchConnectorM365,
  "hello-world-tab-with-backend": HelloWorldTabWithBackend,
  "graph-toolkit-contact-exporter": GraphToolkitContactExporter,
  "bot-sso": BOTSSO,
  "graph-connector-app": GraphConnector,
  "adaptive-card-notification": AdaptiveCardNotification,
  "incoming-webhook-notification": IncomingWebhook,
  "graph-toolkit-one-productivity-hub": GraphToolkitOneProductivityHub,
  "bot-proactive-messaging-teamsfx": SendProactiveMsg,
  "stocks-update-notification-bot": StockUpdate,
  "query-org-user-with-message-extension-sso": MsgExtSSO,
  "teams-videoapp-sample": VideoFilterApp,
  "team-central-dashboard": DashboardTab,
  "hello-world-teams-tab-and-outlook-add-in": TeamsTabAndOutlookAddin,
  "outlook-add-in-set-signature": OutlookSetSignatureAddin,
  "developer-assist-dashboard": DevAssistDashboard,
  "live-share-dice-roller": LiveShareDiceRoller,
  "teams-chef-bot": TeamsChef,
};

export default class SampleGallery extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
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
                <h1>Samples</h1>
                <h3>
                  Explore our sample apps to quickly get started with concepts and code examples.
                </h3>
              </div>
            </div>
            <div className="sample-stack">
              <SampleAppCardList
                samples={this.state.samples}
                highlightSample={this.highlightSample}
              />
            </div>
          </div>
        )}
        {this.state.highlightSample != "" && (
          <SampleDetailPage
            url={hightSample.url}
            image={imageMapping[hightSample.id]}
            tags={hightSample.tags}
            time={hightSample.time}
            configuration={hightSample.configuration}
            title={hightSample.title}
            description={hightSample.fullDescription}
            sampleAppFolder={hightSample.id}
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
      return samples.map((sample, index) => {
        return (
          <SampleCard
            url={sample.url}
            image={imageMapping[sample.id]}
            tags={sample.tags}
            time={sample.time}
            configuration={sample.configuration}
            title={sample.title}
            description={sample.fullDescription}
            sampleAppFolder={sample.id}
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
        onClick={this.onSampleCard}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            this.onSampleCard();
          }
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
        <h3>{this.props.title}</h3>
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

  onSampleCard = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ClickSampleCard,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.Webview,
          [TelemetryProperty.SampleAppName]: this.props.sampleAppFolder,
        },
      },
    });
    this.props.highlightSample(this.props.sampleAppFolder);
  };
}
