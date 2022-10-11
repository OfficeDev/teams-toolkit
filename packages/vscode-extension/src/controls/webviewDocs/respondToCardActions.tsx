import * as React from "react";
import Collapsible from "react-collapsible";
import { ActionButton, Image } from "@fluentui/react";
import "./document.scss";
import { VSCodeButton, VSCodeTag } from "@vscode/webview-ui-toolkit/react";
import adaptiveCard from "../../../img/adaptive-card.gif";

export default function RespondToCardActions() {
  return (
    <div className="doc">
      <h1>Respond to card actions</h1>
      <h2>You can incrementally add card actions from Notification bot and Command bot</h2>
      <Image className="image" src={adaptiveCard} />
      <h1>Handle Card Action</h1>
      <VSCodeButton appearance="secondary">View Tutorial</VSCodeButton>
      <VSCodeButton>Get code snippets</VSCodeButton>
      <p>
        Click “Get code snippets” to get instructions and bootstrap reference code to accelerate
        development. Teams Toolkit will scaffold following files into your project.
      </p>
      <table>
        <tr>
          <th>Type</th>
          <th>File</th>
          <th>Data Model</th>
        </tr>
        <tr>
          <td>Create</td>
          <td>cardActions\cardModel.ts</td>
          <td>Purpose</td>
        </tr>
        <tr>
          <td>Create</td>
          <td>cardActions\helloWorldActionHandler.ts</td>
          <td>Default view</td>
        </tr>
        <tr>
          <td>Create</td>
          <td>cardActions\README.md</td>
          <td>Instruction</td>
        </tr>
      </table>
      <Collapsible trigger="Add an action to your adaptive card">
        <p>
          Here's a sample action with type <code>Action.Execute</code>
        </p>
        <code>
          {`{ 
  "type": "AdaptiveCard", 
  "body": [
    ...
    {
      "type": "ActionSet",
      "actions": [
        {
          "type": "Action.Execute",
          "title": "DoStuff",
          "verb": "doStuff" 
        }
      ]
    }
  ]
  ... 
}`}
        </code>
      </Collapsible>
    </div>
  );
}
