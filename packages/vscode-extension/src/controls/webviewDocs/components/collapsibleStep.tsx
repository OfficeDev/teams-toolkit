import "./collapsibleStep.scss";

import * as React from "react";
import Collapsible from "react-collapsible";

import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../../telemetry/extTelemetryEvents";
import { Commands } from "../../Commands";
import { Chevron } from "../../resources";

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
  triggerFrom: TelemetryTriggerFrom;
  identifier: string;
  children: React.ReactNode;
}) {
  const [isInTransition, setIsInTransition] = React.useState(false);
  const transitionClassName = isInTransition ? "Collapsible__trigger__transition" : "";
  const onOpen = () => {
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.ExpandGuideStep,
        properties: {
          [TelemetryProperty.TriggerFrom]: props.triggerFrom,
          [TelemetryProperty.Identifier]: props.identifier,
        },
      },
    });
  };
  const onClosing = () => {
    setIsInTransition(!isInTransition);
    setTimeout(() => {}, 400);
  };
  const onClose = () => {
    setIsInTransition(!isInTransition);
    vscode.postMessage({
      command: Commands.SendTelemetryEvent,
      data: {
        eventName: TelemetryEvent.CollapseGuideStep,
        properties: {
          [TelemetryProperty.TriggerFrom]: props.triggerFrom,
          [TelemetryProperty.Identifier]: props.identifier,
        },
      },
    });
  };

  return (
    <Collapsible
      className={["collapsibleStep", `${transitionClassName}`].join(" ")}
      trigger={<StepTitle step={props.step} title={props.title} />}
      open={true}
      onTriggerOpening={onOpen}
      onClosing={onClosing}
      onClose={onClose}
    >
      {props.children}
    </Collapsible>
  );
}
