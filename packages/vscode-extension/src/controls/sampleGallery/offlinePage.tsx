// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "./offlinePage.scss";

import * as React from "react";

import OfflineImage from "../../../img/webview/sample/offline.svg?react";

export default class OfflinePage extends React.Component<unknown, unknown> {
  constructor(props: unknown) {
    super(props);
  }

  render() {
    return (
      <div className="offlinePage">
        <div className="offlineImage">
          <OfflineImage height="118px" width="118px" />
        </div>
        <div className="offlineTitle">The sample gallery can't be reached.</div>
        <div className="offlineMessage">
          Github.com takes too long to respond.
          <br />
          Try:
          <ul>
            <li>Checking the connection.</li>
            <li>Checking the proxy and the firewall.</li>
          </ul>
        </div>
      </div>
    );
  }
}
