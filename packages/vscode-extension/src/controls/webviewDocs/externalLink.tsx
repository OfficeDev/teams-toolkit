import * as React from "react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { ExternalLink as ExternalLinkIcon } from "../resources";

export default function ExternalLink(props: { title: string; link: string }) {
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
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
          [TelemetryProperty.Identifier]: props.link,
        },
      },
    });
  };

  return (
    <span>
      <a href="javascript:void(0)" onClick={onOpenLink}>
        {props.title}
      </a>
      <span className="externalLink">
        <ExternalLinkIcon />
      </span>
    </span>
  );
}
