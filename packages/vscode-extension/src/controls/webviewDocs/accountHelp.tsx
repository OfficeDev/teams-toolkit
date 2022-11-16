import "./components/github.scss";
import "./components/document.scss";

import * as React from "react";

import {
  InProductGuideInteraction,
  TelemetryEvent,
  TelemetryProperty,
  TelemetryTriggerFrom,
} from "../../telemetry/extTelemetryEvents";
import { Commands } from "../Commands";
import CollapsibleStep from "./components/collapsibleStep";
import ExternalLink from "./components/externalLink";
import { useEffect } from "react";
import M365Sandbox from "../../../img/webview/accountHelp/m365-dev-program-instant-sandbox.png";
import M365Account from "../../../img/webview/accountHelp/ttk-m365-account.png";

export default function PrepareM365Account() {
  let scrollToBottom = false;

  const [theme, setTheme] = React.useState("light");

  useEffect(() => {
    let currentTheme = document.body.className;
    const prefix = "vscode-";
    if (currentTheme.startsWith(prefix)) {
      // strip prefix
      currentTheme = currentTheme.substring(prefix.length);
    }

    if (currentTheme === "high-contrast") {
      currentTheme = "dark"; // the high-contrast theme seems to be an extreme case of the dark theme
    }

    if (theme === currentTheme) return;
    setTheme(currentTheme);

    const handleScroll = () => {
      if (!scrollToBottom && window.scrollY > 2500) {
        scrollToBottom = true;
        vscode.postMessage({
          command: Commands.SendTelemetryEvent,
          data: {
            eventName: TelemetryEvent.InteractWithInProductDoc,
            properties: {
              [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.InProductDoc,
              [TelemetryProperty.Interaction]: InProductGuideInteraction.ScrollToBottom,
              [TelemetryProperty.TutorialName]: "workflow-bot",
            },
          },
        });
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="markdown-body">
      <h1 id="prepare-a-qualified-Microsoft-365-account-for-Teams-app-development">
        Prepare a Qualified Microsoft 365 Account for Teams App Development
      </h1>
      <h2 id="account-requirements ">Account Requirements </h2>
      <p>
        The following two conditions are required for Teams app development:
        <ol>
          <li>
            The Microsoft 365 account should be your work or school account, not your personal
            account.
          </li>
          <li>
            The Microsoft 365 account should be granted with sideloading permission to update the
            Teams app.
          </li>
        </ol>
      </p>
      <p>
        Sideloading is the permission of your Microsoft 365 account to upload the Teams app to Teams
        client. You can contact your tenant administrator to turn on the sideloading permission for
        your organization.{" "}
      </p>
      <p>
        Or you can create a free qualified Microsoft 365 development account to resolve the above
        issues you may have.
      </p>

      <h2 id="how">How</h2>
      <div className="collapsibleSteps">
        <CollapsibleStep
          step={1}
          title="Create Microsoft 365 Development Account"
          identifier="account-help-step1"
        >
          <p>
            Select the button below to create an instant sandbox and get your developer account.
          </p>
          <p>
            <a href="https://developer.microsoft.com/en-us/microsoft-365/dev-program">
              <button>Sign up for Microsoft 365 developer program for free</button>
            </a>
          </p>
          <p>
            For more information, visit the{" "}
            <ExternalLink
              title="Set up a developer subscription documentation"
              link="https://learn.microsoft.com/en-us/office/developer-program/microsoft-365-developer-program-get-started"
            />
          </p>
          <p>Once successfully registered, you will see this page:</p>
          <p>
            <img src={M365Sandbox} alt="Microsoft 365 developer subscriptions" />
          </p>
          <blockquote>
            <p>
              You will use the Administrator (*.onmicrosoft.com) email address created in this step
              to login to your development environment.
            </p>
          </blockquote>
        </CollapsibleStep>
      </div>
      <div className="collapsibleSteps">
        <CollapsibleStep
          step={2}
          title="Use your development account in Teams Toolkit for Visual Studio Code"
          identifier="account-help-step2"
        >
          <p>
            Open Teams Toolkit for Visual Studio Code and log into the Teams Toolkit extension using
            your developer account created in step 1.
          </p>
          <p>The sideloading permission has already been configured.</p>
          <p>
            <img src={M365Account} alt="Teams Toolkit Microsoft 365 account" />
          </p>
        </CollapsibleStep>
      </div>
    </div>
  );
}
