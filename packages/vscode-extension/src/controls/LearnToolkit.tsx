import * as React from "react";
import { ActionButton, Icon, PrimaryButton, Image } from "@fluentui/react";
import "./LearnToolkit.scss";
import { Commands } from "./Commands";
import AllCommands from "../../media/teams.png";
import CLI from "../../media/dark/azure.svg";

export default class LearnToolkit extends React.Component<any, any> {
  constructor(props: any) {
    super(props);

    this.state = {
      currentStep: 1,
    };
  }

  componentDidMount() {
    window.addEventListener("message", this.receiveMessage, false);
  }

  render() {
    return (
      <div className="learn-toolkit-page">
        <div className="back">
          <ActionButton
            iconProps={{ iconName: "ChevronLeft", styles: { root: { width: 16, height: 16 } } }}
            onClick={this.onBack}
          >
            Back
          </ActionButton>
        </div>
        <div className="flex-section">
          <div className="table-of-contents">
            <div className="flex-section header">
              <Icon
                style={{ color: "#0097FB", fontSize: 28 }}
                iconName="lightbulb"
                className="logo"
              />
              <div className="title">
                <h2>Learn about the Toolkit</h2>
                <h3>Understand the Teams Toolkit fundamentals</h3>
              </div>
            </div>
            <GetStartedAction
              title="1. What are Teams app 'Capabilities'?"
              content={[
                <a href="https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/capabilities-overview">
                  Capabilities
                </a>,
                " are the extension points for building apps on the Microsoft Teams platform.",
              ]}
              actionText="Watch Video (1 min)"
              secondaryActionText="Next"
              onSecondaryAction={() => {
                this.onNextStep(1);
              }}
              expanded={this.state.currentStep === 1}
            />
            <GetStartedAction
              title="2. How can I use the Command Palette?"
              content="Discover Teams Toolkit actions in VS Code Command Palette."
              actionText="Display all commands"
              onAction={this.displayCommands}
              secondaryActionText="Next"
              onSecondaryAction={() => {
                this.onNextStep(2);
              }}
              expanded={this.state.currentStep === 2}
              tip="Tip: Open Command Palette and type 'Teams' to find all relevant commands."
            />
            <GetStartedAction
              title="3. How can I use the Command Line Interface(CLI)?"
              content="Increase efficiency with the Teams Toolkit CLI"
              actionText="Display all CLI commands"
              secondaryActionText="Next page"
              onSecondaryAction={this.onNextPage}
              expanded={this.state.currentStep === 3}
              tip="Tip: Open Terminal (^') and type 'Teams --help' to see all CLI commands"
            />
          </div>
          <div className="stage">
            {this.state.currentStep === 1 && <Image src={AllCommands} />}
            {this.state.currentStep === 2 && <Image src={AllCommands} />}
            {this.state.currentStep === 3 && <Image src={CLI} />}
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
  };

  onBack = () => {
    this.props.history.go(-1);
  };

  onNextStep = (step: number) => {
    this.setState({
      currentStep: step + 1,
    });
  };

  onNextPage = () => {};

  displayCommands = () => {
    vscode.postMessage({
      command: Commands.DisplayCommandPalette,
      data: "Teams",
    });
  };
}

class GetStartedAction extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
  }

  render() {
    if (this.props.expanded) {
      return (
        <div className="action-card">
          <div className="flex-section card-line">
            <Icon
              style={{ color: "#3794FF", fontSize: 16 }}
              iconName="lightbulb"
              className="action-icon"
            />
            <div className="action-title">{this.props.title}</div>
          </div>
          <div className="card-line">{this.props.content}</div>
          <div className="left-right-align">
            <div className="left">
              <PrimaryButton onClick={this.props.onAction} text={this.props.actionText} />
            </div>
            <div className="right">
              <ActionButton
                onClick={this.props.onSecondaryAction}
                text={this.props.secondaryActionText}
              />
            </div>
          </div>
          <div className="tip">{this.props.tip}</div>
        </div>
      );
    } else {
      return (
        <div className="collapse-action-card">
          <div className="flex-section">
            <Icon
              style={{ color: "##3794FF", fontSize: 16 }}
              iconName="lightbulb"
              className="action-icon"
            />
            <div className="action-title">{this.props.title}</div>
          </div>
        </div>
      );
    }
  }
}
