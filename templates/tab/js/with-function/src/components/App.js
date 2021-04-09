// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import React from "react";
// https://fluentsite.z22.web.core.windows.net/quick-start
import { Provider, teamsTheme } from "@fluentui/react-northstar";
import { HashRouter as Router, Redirect, Route } from "react-router-dom";
import { useTeams } from "msteams-react-base-component";
import "./App.css";
import Privacy from "./Privacy";
import TermsOfUse from "./TermsOfUse";
import Tab from "./Tab2";

/**
 * The main app which handles the initialization and routing
 * of the app.
 */
export default function App() {
  const [{ theme }] = useTeams({});
  return (
    <Provider
      theme={theme || teamsTheme}
      styles={{ backgroundColor: "#eeeeee" }}
    >
      <Router>
        <Route exact path="/privacy" component={Privacy} />
        <Route exact path="/termsofuse" component={TermsOfUse} />
        <Route exact path="/tab" component={Tab} />
        <Route exact path="/">
          <Redirect to="/tab" />
        </Route>
      </Router>
    </Provider>
  );
}
