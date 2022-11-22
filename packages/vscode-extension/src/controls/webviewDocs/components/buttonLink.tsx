import * as React from "react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { Commands } from "../../Commands";

export default function ButtonLink(props: {
  title: string;
  link: string;
  triggerFrom: TelemetryTriggerFrom;
}) {
  const onOpenLink = () => {
    vscode.postMessage({
      command: Commands.OpenExternalLink,
      data: props.link,
    });
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.OpenExternalLink,
        properties: {
          [TelemetryProperty.TriggerFrom]: props.triggerFrom,
          [TelemetryProperty.Identifier]: props.title,
        },
      },
    });
  };

  return (
    <span>
      <a href="javascript:void(0)" onClick={onOpenLink}>
        <button>{props.title}</button>
      </a>
    </span>
  );
}
