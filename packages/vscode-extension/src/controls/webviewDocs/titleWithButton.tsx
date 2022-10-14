import "./titleWithButton.scss";

import * as React from "react";

import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Commands } from "../Commands";

export default function TitleWithButton(props: { title: string }) {
  const onGetCodeSnippets = () => {
    vscode.postMessage({
      command: Commands.GetCodeSnippets,
      data: props.title,
    });
  };

  const onViewTutorial = () => {
    vscode.postMessage({
      command: Commands.ViewTutorial,
      data: props.title,
    });
  };

  return (
    <div className="titleWithButton">
      <h2>{props.title}</h2>
      <div className="buttons">
        <VSCodeButton onClick={onGetCodeSnippets}>Get code snippets</VSCodeButton>
        <VSCodeButton appearance="secondary" onClick={onViewTutorial}>
          View Tutorial
        </VSCodeButton>
      </div>
    </div>
  );
}
