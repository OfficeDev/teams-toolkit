import "./codeSnippet.scss";

import * as React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";

export default function CodeSnippet(props: { data: string; language: string; identifier: string }) {
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
          <button>Copy</button>
        </CopyToClipboard>
      </div>
      <div className="code">
        <pre>
          <code className={props.language}>{props.data}</code>
        </pre>
      </div>
    </div>
  );
}
