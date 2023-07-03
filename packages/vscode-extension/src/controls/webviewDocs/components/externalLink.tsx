import * as React from "react";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { Commands } from "../../Commands";
import { ExternalLink as ExternalLinkIcon } from "../../resources";

export default function ExternalLink(props: {
  title: string;
  link: string;
  triggerFrom: TelemetryTriggerFrom;
  docName?: string;
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
          [TelemetryProperty.TutorialName]: props.docName,
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
