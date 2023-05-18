(function () {
  "use strict";

  // Call the initialize API first
  microsoftTeams.app.initialize();

  microsoftTeams.app.getContext().then(function (context) {
    if (context?.app?.host?.name) {
      updateHubState(context.app.host.name);
    }
  });

  function updateHubState(hubName) {
    if (hubName) {
      document.getElementById("hubState").innerHTML = "in " + hubName;
    }
  }
})();
