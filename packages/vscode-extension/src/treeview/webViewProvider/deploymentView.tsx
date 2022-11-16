import * as React from "react";
import "./tree.scss";
import { getCurrentTheme, Theme } from "./theme";
import { TreeItem } from "./treeItem";
import { localize } from "../../utils/localizeUtils";

export class DeploymentView extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      colorTheme: Theme.Dark,
      locked: false,
    };
  }

  componentDidMount() {
    window.addEventListener("message", this.receiveMessage, false);
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    const targetNode = document.getElementsByTagName("body")[0];
    // Options for the observer (which mutations to observe)
    const config = { attributes: true };
    // Callback function to execute when mutations are observed
    const callback = (mutationsList: any) => {
      // Use traditional 'for loops' for IE 11
      for (const mutation of mutationsList) {
        if (mutation.type === "attributes") {
          const theme = getCurrentTheme(mutation);
          this.setState({
            colorTheme: theme,
          });
        }
      }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
  }

  render() {
    return (
      <div>
        <TreeItem
          label="Provision in the cloud"
          tooltip={localize("teamstoolkit.commandsTreeViewProvider.provisionDescription")}
          icon="codicon codicon-type-hierarchy"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.provision"
        ></TreeItem>
        <TreeItem
          label="Zip Teams metadata package"
          tooltip={localize("teamstoolkit.commandsTreeViewProvider.buildPackageDescription")}
          icon="codicon codicon-package"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.build"
        ></TreeItem>
        <TreeItem
          label="Deploy to the cloud"
          tooltip={localize("teamstoolkit.commandsTreeViewProvider.deployDescription")}
          icon="codicon codicon-cloud-upload"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.deploy"
        ></TreeItem>
        <TreeItem
          label="Publish to Teams"
          tooltip={localize("teamstoolkit.commandsTreeViewProvider.publishDescription")}
          icon="codicon codicon-export"
          customized={true}
          disable={this.state.locked}
          command="fx-extension.publish"
        ></TreeItem>
        <TreeItem
          label="Developer Portal for Teams"
          tooltip={localize("teamstoolkit.commandsTreeViewProvider.teamsDevPortalDescription")}
          icon="codicon teamsfx-developer-portal"
          customized={true}
          disable={false}
          command="fx-extension.openAppManagement"
        ></TreeItem>
      </div>
    );
  }

  receiveMessage = (event: any) => {
    const message = event.data.message;

    switch (message) {
      case "lockChanged":
        this.setState({ locked: event.data.data });
        break;
      default:
        break;
    }
  };
}
