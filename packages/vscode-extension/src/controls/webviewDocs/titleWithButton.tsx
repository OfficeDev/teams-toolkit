import * as React from "react";
import "./titleWithButton.scss";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";

export default function TitleWithButton(props: { title: string }) {
  return (
    <div className="titleWithButton">
      <h2>{props.title}</h2>
      <div className="buttons">
        <VSCodeButton>Get code snippets</VSCodeButton>
        <VSCodeButton appearance="secondary">View Tutorial</VSCodeButton>
      </div>
    </div>
  );
}
