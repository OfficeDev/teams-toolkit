import * as microsoftTeams from "@microsoft/teams-js";
import { HostName } from "@microsoft/teams-js";

(function () {
  "use strict";

  // Call the initialize API first
  microsoftTeams.app.initialize().then(function () {
    microsoftTeams.app.getContext().then(function (context) {
      if (context?.app?.host?.name) {
        updateHubState(context.app.host.name);
      }
    });
  });

  function updateHubState(hubName: HostName) {
    if (hubName) {
      document.getElementById("hubState").innerHTML = "in " + hubName;
    }
  }
})();
