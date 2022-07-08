async function func() {
  const msft = await //TODO: Dynamic import is not handled, please update it manually.
  import("@microsoft/teams-js");

  msft.initialize();

  const initialize = (await //TODO: Dynamic import is not handled, please update it manually.
  import("@microsoft/teams-js")).initialize;

  (await //TODO: Dynamic import is not handled, please update it manually.
  import("@microsoft/teams-js")).initialize();
}