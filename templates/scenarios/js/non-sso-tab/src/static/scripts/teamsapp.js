(function () {
  "use strict";

  // Call the initialize API first
  microsoftTeams.app.initialize();

  microsoftTeams.app.getContext().then(function (context) {
    if (context?.app?.host?.name) {
      updateHubName(context.app.host.name);
    }
  });

  function updateHubName(hubName) {
    if (hubName) {
      document.getElementById("hubName").innerHTML = hubName;
    }
  }
})();
