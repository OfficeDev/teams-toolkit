import * as React from "react";

import { ExternalLink as ExternalLinkIcon } from "../resources";

export default function ExternalLink(props: { title: string; link: string }) {
  return (
    <span>
      <a href={props.link}>{props.title}</a>
      <span className="externalLink">
        <ExternalLinkIcon />
      </span>
    </span>
  );
}
