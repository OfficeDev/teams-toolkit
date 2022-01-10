import * as React from "react";
import "./tree.scss";
import publish_dark from "../../media/dark/publish.svg";
import publish_light from "../../media/light/publish.svg";
import developerPortal_dark from "../../media/dark/developerPortal.svg";
import developerPortal_light from "../../media/light/developerPortal.svg";
import * as StringResources from "../resources/Strings.json";
import { getCurrentTheme, Theme } from "./theme";
import { TreeItem } from "./treeItem";

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
          tooltip={StringResources.vsc.commandsTreeViewProvider.provisionDescription}
          icon="codicon codicon-type-hierarchy"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.provision"
        ></TreeItem>
        <TreeItem
          label="Zip Teams metadata package"
          tooltip={StringResources.vsc.commandsTreeViewProvider.buildPackageDescription}
          icon="codicon codicon-package"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.build"
        ></TreeItem>
        <TreeItem
          label="Deploy to the cloud"
          tooltip={StringResources.vsc.commandsTreeViewProvider.deployDescription}
          icon="codicon codicon-cloud-upload"
          customized={false}
          disable={this.state.locked}
          command="fx-extension.deploy"
        ></TreeItem>
        <TreeItem
          label="Publish to Teams"
          tooltip={StringResources.vsc.commandsTreeViewProvider.publishDescription}
          icon={this.state.colorTheme === Theme.Dark ? publish_dark : publish_light}
          customized={true}
          disable={this.state.locked}
          command="fx-extension.publish"
        ></TreeItem>
        <TreeItem
          label="Developer Portal for Teams"
          tooltip={StringResources.vsc.commandsTreeViewProvider.teamsDevPortalDescription}
          icon={this.state.colorTheme === Theme.Dark ? developerPortal_dark : developerPortal_light}
          customized={true}
          disable={false}
          command="fx-extension.openAppManagement"
        ></TreeItem>
        <TreeItem
          label="Add CI/CD Workflows"
          tooltip={StringResources.vsc.commandsTreeViewProvider.addCICDWorkflowsDescription}
          icon="codicon codicon-sync"
          customized={false}
          disable={false}
          command="fx-extension.addCICDWorkflows"
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
