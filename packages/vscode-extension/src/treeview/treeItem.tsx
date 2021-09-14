import * as React from "react";
import { ActionButton, DirectionalHint, TooltipHost } from "@fluentui/react";
import "./tree.scss";
import { Commands } from "../controls/Commands";

export class TreeItem extends React.Component<any, any> {
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
          gapSpace: 2,
          isBeakVisible: false,
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
        <div
          id={this.props.label}
          className="row"
          style={{ opacity: this.props.disable ? 0.4 : 1 }}
        >
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
