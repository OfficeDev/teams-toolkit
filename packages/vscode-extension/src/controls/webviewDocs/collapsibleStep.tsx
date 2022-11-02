import "./collapsibleStep.scss";

import * as React from "react";
import Collapsible from "react-collapsible";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import { Chevron } from "../resources";

function StepTitle(props: { step: number; title: string }) {
  return (
    <div className="stepContainer">
      <div className="stepTitle">
        <p className="step">Step {props.step}</p>
        <h2 className="title">{props.title}</h2>
      </div>
      <div className="chevron">
        <Chevron />
      </div>
    </div>
  );
}

export default function CollapsibleStep(props: {
  step: number;
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  const onOpen = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ExpandStep,
        properties: {
          [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
          [TelemetryProperty.DocumentStep]: props.tag,
        },
      },
    });
  };

  return (
    <Collapsible
      className="collapsibleStep"
      trigger={<StepTitle step={props.step} title={props.title} />}
      onTriggerOpening={onOpen}
    >
      {props.children}
    </Collapsible>
  );
}
