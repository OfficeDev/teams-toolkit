import * as microsoftTeams from "@microsoft/teams-js";
function myFunc() {
  const result = microsoftTeams.getContext(123);
  if (1 === 1) {
    let x = undefined;
    x = microsoftTeams.getContext(123);
    microsoftTeams.getContext(123);
  }
}
microsoftTeams.getContext(123);
