import "./codeSnippet.scss";

import * as React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import SyntaxHighlighter from "react-syntax-highlighter";
import { lightfair, dark } from "react-syntax-highlighter/dist/esm/styles/hljs";

import { Icon } from "@fluentui/react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { Commands } from "../../Commands";

export default function CodeSnippet(props: {
  data: string;
  language: string;
  theme: string;
  identifier: string;
}) {
  const onCopyCode = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.CopyCodeSnippet,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
          [TelemetryProperty.Identifier]: props.identifier,
        },
      },
    });
  };

  return (
    <div className="codeSnippet">
      <div className="codeTitle">
        <CopyToClipboard text={props.data} onCopy={onCopyCode}>
          <div className="copyButton">
            <span>
              <Icon iconName="Copy" />
            </span>
            <button>Copy</button>
          </div>
        </CopyToClipboard>
      </div>
      <div>
        <SyntaxHighlighter
          language={props.language}
          style={props.theme === "light" ? lightfair : dark}
          className="codeBlock"
        >
          {props.data}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
