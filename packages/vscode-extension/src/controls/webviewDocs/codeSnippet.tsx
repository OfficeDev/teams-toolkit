import "./codeSnippet.scss";

import * as React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

export default function CodeSnippet(props: { data: string; language: string }) {
  return (
    <div className="codeSnippet">
      <div className="codeTitle">
        <CopyToClipboard text={props.data} onCopy={() => {}}>
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
