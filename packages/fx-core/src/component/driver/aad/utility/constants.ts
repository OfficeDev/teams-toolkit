// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export const logMessageKeys = {
  startExecuteDriver: "driver.aadApp.log.startExecuteDriver",
  successExecuteDriver: "driver.aadApp.log.successExecuteDriver",
  failExecuteDriver: "driver.aadApp.log.failExecuteDriver",
  startCreateAadApp: "driver.aadApp.log.startCreateAadApp",
  successCreateAadApp: "driver.aadApp.log.successCreateAadApp",
  skipCreateAadApp: "driver.aadApp.log.skipCreateAadApp",
  startGenerateClientSecret: "driver.aadApp.log.startGenerateClientSecret",
  successGenerateClientSecret: "driver.aadApp.log.successGenerateClientSecret",
  skipGenerateClientSecret: "driver.aadApp.log.skipGenerateClientSecret",
  outputAadAppManifest: "driver.aadApp.log.outputAadAppManifest",
  successUpdateAadAppManifest: "driver.aadApp.log.successUpdateAadAppManifest",
};

export const descriptionMessageKeys = {
  create: "driver.aadApp.description.create",
  update: "driver.aadApp.description.update",
};

export const permissionsKeys = {
  name: "Microsoft Entra App",
  owner: "Owner",
  noPermission: "No Permission",
  type: "M365",
};

export const aadErrorCode = {
  permissionErrorCode: "CannotDeleteOrUpdateEnabledEntitlement",
  hostNameNotOnVerifiedDomain: "HostNameNotOnVerifiedDomain", // Using unverified domain in multi tenant scenario
  credentialInvalidLifetimeAsPerAppPolicy: "CredentialInvalidLifetimeAsPerAppPolicy",
  credentialTypeNotAllowedAsPerAppPolicy: "CredentialTypeNotAllowedAsPerAppPolicy",
};

export const constants = {
  aadAppPasswordDisplayName: "default",
  oauthAuthorityPrefix: "https://login.microsoftonline.com",
  defaultHelpLink: "https://aka.ms/teamsfx-actions/aadapp-create",
};

export const telemetryKeys = {
  newAadApp: "new-aad-app",
};
