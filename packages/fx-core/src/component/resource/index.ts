// export * from "./aad";
// export * from "./azureFunction";
export * from "./azureSql";
// export * from "./azureStorage";
export * from "./azureWebApp";
export * from "./botService";
// export * from "./spfx";
export * from "./teamsManifest";

export const ResourceComponentNames = {
  teams: "teams-manifest",
  aad: "aad",
  function: "azure-function",
  webApp: "azure-web-app",
  storage: "azure-storage",
  spfx: "spfx",
  identity: "identity",
  apim: "apim",
  keyVault: "key-vault",
  sql: "azure-sql",
};
