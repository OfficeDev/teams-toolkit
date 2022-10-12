import "./collapsibleStep.scss";

import * as React from "react";
import Collapsible from "react-collapsible";

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
  children: React.ReactNode;
}) {
  return (
    <Collapsible
      className="collapsibleStep"
      trigger={<StepTitle step={props.step} title={props.title} />}
    >
      {props.children}
    </Collapsible>
  );
}
