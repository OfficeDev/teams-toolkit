import "./document.scss";
import "highlight.js/styles/github.css";

import hljs from "highlight.js/lib/core";
import * as React from "react";

import { Image } from "@fluentui/react";

import adaptiveCard from "../../../img/adaptive-card.gif";
import CollapsibleStep from "./collapsibleStep";
import TitleWithButton from "./titleWithButton";

export default function RespondToCardActions() {
  return (
    <div className="doc">
      <h1>Respond to card actions</h1>
      <h2>You can incrementally add card actions from Notification bot and Command bot</h2>
      <Image className="image" src={adaptiveCard} />
      <TitleWithButton title="Handle Card Action" />
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
      <div className="collapsibleSteps">
        <CollapsibleStep step={1} title="Add an action to your adaptive card">
          <p>
            Here's a sample action with type <code>Action.Execute</code>
          </p>
          <div className="code">
            <pre>
              <code className="language-json">
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
            </pre>
          </div>
        </CollapsibleStep>
      </div>
      <CollapsibleStep step={4} title="Register the action handler">
        <p>
          1. Go to <code>bot/src/internal/initialize.ts</code>;
        </p>
        <p>
          2. Update your <code>conversationBot</code> initialization to enable cardAction feature
          and add the handler to <code>action</code> array:
        </p>
        <div className="code">
          <pre>
            <code className="language-typescript">
              {`export const commandBot = new ConversationBot({ 
  ... 
  cardAction: { 
    enabled: true, 
    actions: [ 
      new Handler1() 
     ], 
   } 
});`}
            </code>
          </pre>
        </div>
      </CollapsibleStep>
    </div>
  );
}
