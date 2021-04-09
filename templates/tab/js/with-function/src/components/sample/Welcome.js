import React from "react";
import {  Button, Image } from "@fluentui/react-northstar";
import { Progress } from "./Progress";
import "./Welcome.css";

export function Welcome() {
  return (
    <div className="welcome page">
      <div className="narrow page-padding">
        <Image src={"thumbsup.png"} />
        <h1 className="center">Congratulations, Zhenya Savchenko!</h1>
        <p className="center">Your Custom Tab is running in your local environment</p>
        <Progress selectedIndex={0}>
          <div>Preview in Local Environment</div>
          <div>Deploy to the Cloud</div>
          <div>Publish to Teams</div>
        </Progress>

        <div className="section">
          <h2>Call Azure Function</h2>
          <p>An Azure Function is running locally in debug mode. Click below to call it for a response:</p>
          <Button primary content="Call Azure Function" />
          <pre>Function response will be displayed here</pre>

          <h4>How to edit the Azure Function</h4>
          <p>See the code in <code>api/[your function name]/index.js</code> to add your business logic.</p>
          <p>For more information, see the <a href="#!">docs</a>.</p>
        </div>
      </div>
    </div>
  );
}
