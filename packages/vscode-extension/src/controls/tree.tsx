import * as React from "react";
import * as ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
import { initializeIcons } from "@fluentui/react/lib/Icons";
import { ActionButton, Callout, DirectionalHint, Tooltip, TooltipHost } from "@fluentui/react";
import "./tree.scss";
import publish_dark from "../../media/dark/publish.svg";
import publish_light from "../../media/light/publish.svg";
import developerPortal_dark from "../../media/dark/developerPortal.svg";
import developerPortal_light from "../../media/light/developerPortal.svg";
import { Commands } from "./Commands";
import * as StringResources from "../resources/Strings.json";
import { buildPackageHandler } from "../handlers";

const language = "en";

class App extends React.Component {
  constructor(props: any) {
    super(props);
    // Initializing the office-ui-fabric-icons here to avoid multiple initializations in every component.
    initializeIcons();
  }

  componentDidMount() {
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  render() {
    return (
      <div>
        <TreeItem
          label="Provision in the cloud"
          tooltip={StringResources.vsc.commandsTreeViewProvider.provisionDescription}
          icon="codicon codicon-type-hierarchy"
          customized={false}
          disable={false}
          command="fx-extension.provision"
        ></TreeItem>
        <TreeItem
          label="Validate manifest file"
          tooltip={StringResources.vsc.commandsTreeViewProvider.validateManifestDescription}
          icon="codicon codicon-checklist"
          customized={false}
          disable={true}
          command="fx-extension.validateManifest"
        ></TreeItem>
        <TreeItem
          label="Zip Teams metadata package"
          tooltip={StringResources.vsc.commandsTreeViewProvider.buildPackageDescription}
          icon="codicon codicon-package"
          customized={false}
          disable={false}
          command="fx-extension.build"
        ></TreeItem>
        <TreeItem
          label="Deploy to the cloud"
          tooltip={StringResources.vsc.commandsTreeViewProvider.deployDescription}
          icon="codicon codicon-cloud-upload"
          customized={false}
          disable={false}
          command="fx-extension.deploy"
        ></TreeItem>
        <TreeItem
          label="Publish to Teams"
          tooltip={StringResources.vsc.commandsTreeViewProvider.publishDescription}
          icon={publish_dark}
          customized={true}
          disable={false}
          command="fx-extension.publish"
        ></TreeItem>
        <TreeItem
          label="Developer Portal for Teams"
          tooltip={StringResources.vsc.commandsTreeViewProvider.teamsDevPortalDescription}
          icon={developerPortal_dark}
          customized={true}
          disable={false}
          command="fx-extension.openAppManagement"
        ></TreeItem>
        {/* <TreeItem
          label="CI/CD guide"
          icon="codicon codicon-sync"
          customized={false}
          disable={false}
          command="fx-extension.cicdGuide"
        ></TreeItem> */}
      </div>
    );
  }
}

class TreeItem extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      hoverEvent: undefined,
    };
  }

  render() {
    return (
      <TooltipHost
        content={this.props.tooltip}
        tooltipProps={{
          styles: {
            content: {
              color: "#cccccc",
              fontSize: "13px",
              lineHeight: "19px",
              maxWidth: "500px",
              overflow: "hidden",
            },
          },
        }}
        calloutProps={{
          gapSpace: 0,
          isBeakVisible: false,
          target: this.state.hoverEvent,
          directionalHint: DirectionalHint.bottomLeftEdge,
          styles: {
            root: {
              backgroundColor: "#252526",
              border: "1px solid #454545",
              borderRadius: 0,
              padding: "4px 8px",
              margin: 0,
            },
            calloutMain: {
              backgroundColor: "#252526",
            },
          },
        }}
      >
        <div id={this.props.label} className="row">
          <ActionButton
            allowDisabledFocus
            disabled={this.props.disable}
            tabIndex={-1}
            onMouseUp={this.onMouseUp}
            onClick={this.onClick}
            onMouseEnter={this.onMouseEnter}
          >
            {this.props.customized && <img src={this.props.icon}></img>}
            {!this.props.customized && <div className={this.props.icon}></div>}
            {this.props.label}
            <p>{this.props.description}</p>
          </ActionButton>
        </div>
      </TooltipHost>
    );
  }

  onMouseUp = (e: React.MouseEvent<HTMLElement>) => {
    if (e.button === 0) {
      const item = document.getElementById(this.props.label);
      if (item) {
        item.focus();
        vscode.postMessage({
          command: Commands.ExecuteCommand,
          id: this.props.command,
        });
      }
    }
  };

  onClick = () => {};

  onMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    this.setState({
      hoverEvent: e,
    });
  };
}

ReactDOM.render(
  <IntlProvider locale={language}>
    <App />
  </IntlProvider>,
  document.getElementById("root") as HTMLElement
);
