// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { AadManifestHelper } from "../../../../../src/plugins/resource/aad/utils/aadManifestHelper";

describe("AAD manifest helper Test", () => {
  it("manifestToApplication", async () => {
    const aadApp = AadManifestHelper.manifestToApplication(fakeAadManifest);
    chai.expect(aadApp).to.deep.equal(fakeAadApp);
  });

  it("applicationToManifest", async () => {
    const aadManifest = AadManifestHelper.applicationToManifest(fakeAadApp);
    chai.expect(aadManifest).to.deep.equal(fakeAadManifest);
  });
});

const fakeAadApp = {
  id: "fake-id",
  appId: "fake-app-id",
  disabledByMicrosoftStatus: null,
  displayName: "fake-display-name",
  description: null,
  groupMembershipClaims: null,
  identifierUris: ["api://xxx.z13.web.core.windows.net/botid-uuid"],
  isFallbackPublicClient: null,
  notes: null,
  signInAudience: "AzureADMyOrg",
  tags: [],
  tokenEncryptionKeyId: null,
  addIns: [],
  api: {
    acceptMappedClaims: null,
    knownClientApplications: [],
    requestedAccessTokenVersion: 2,
    oauth2PermissionScopes: [
      {
        adminConsentDescription: "Allows Teams to call the app's web APIs as the current user.",
        adminConsentDisplayName: "Teams can access app's web APIs",
        id: "5344c933-4245-425e-9d63-1a9b2a1bbb28",
        isEnabled: true,
        type: "User",
        userConsentDescription:
          "Enable Teams to call this app's web APIs with the same rights that you have",
        userConsentDisplayName: "Teams can access app's web APIs and make requests on your behalf",
        value: "access_as_user",
      },
    ],
    preAuthorizedApplications: [
      {
        appId: "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
        delegatedPermissionIds: ["5344c933-4245-425e-9d63-1a9b2a1bbb28"],
      },
      {
        appId: "5e3ce6c0-2b1f-4285-8d4b-75ee78787346",
        delegatedPermissionIds: ["5344c933-4245-425e-9d63-1a9b2a1bbb28"],
      },
    ],
  },
  appRoles: [
    {
      allowedMemberTypes: ["User"],
      description: "test",
      displayName: "test",
      id: "4439cc9c-44b9-47dd-b162-acea94fd9ff3",
      isEnabled: true,
      value: "test",
    },
  ],
  info: {
    marketingUrl: null,
    privacyStatementUrl: null,
    supportUrl: null,
    termsOfServiceUrl: null,
  },
  keyCredentials: [],
  optionalClaims: {
    accessToken: [
      {
        additionalProperties: [],
        essential: false,
        name: "idtyp",
        source: null,
      },
    ],
    idToken: [],
    saml2Token: [],
  },
  parentalControlSettings: {
    countriesBlockedForMinors: [],
    legalAgeGroupRule: "Allow",
  },
  requiredResourceAccess: [
    {
      resourceAppId: "00000003-0000-0000-c000-000000000000",
      resourceAccess: [
        {
          id: "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
          type: "Scope",
        },
      ],
    },
  ],
  web: {
    homePageUrl: null,
    logoutUrl: null,
    redirectUris: [
      "https://xxx.ngrok.io/api/messages",
      "https://xxx.azurewebsites.net/auth-end.html",
      "https://xxx.z13.web.core.windows.net/auth-end.html",
    ],
    implicitGrantSettings: {
      enableAccessTokenIssuance: false,
      enableIdTokenIssuance: false,
    },
  },
  spa: {
    redirectUris: ["https://xxx.test.com"],
  },
  publicClient: {
    redirectUris: ["https://test.com"],
  },
};

const fakeAadManifest = {
  id: "fake-id",
  appId: "fake-app-id",
  acceptMappedClaims: null,
  accessTokenAcceptedVersion: 2,
  addIns: [],
  allowPublicClient: null,
  appRoles: [
    {
      allowedMemberTypes: ["User"],
      description: "test",
      displayName: "test",
      id: "4439cc9c-44b9-47dd-b162-acea94fd9ff3",
      isEnabled: true,
      value: "test",
    },
  ],
  description: null,
  disabledByMicrosoftStatus: null,
  groupMembershipClaims: null,
  identifierUris: ["api://xxx.z13.web.core.windows.net/botid-uuid"],
  informationalUrls: {
    termsOfService: null,
    support: null,
    privacy: null,
    marketing: null,
  },
  keyCredentials: [],
  knownClientApplications: [],
  logoutUrl: null,
  name: "fake-display-name",
  notes: null,
  oauth2AllowIdTokenImplicitFlow: false,
  oauth2AllowImplicitFlow: false,
  oauth2Permissions: [
    {
      adminConsentDescription: "Allows Teams to call the app's web APIs as the current user.",
      adminConsentDisplayName: "Teams can access app's web APIs",
      id: "5344c933-4245-425e-9d63-1a9b2a1bbb28",
      isEnabled: true,
      type: "User",
      userConsentDescription:
        "Enable Teams to call this app's web APIs with the same rights that you have",
      userConsentDisplayName: "Teams can access app's web APIs and make requests on your behalf",
      value: "access_as_user",
    },
  ],
  optionalClaims: {
    accessToken: [
      {
        additionalProperties: [],
        essential: false,
        name: "idtyp",
        source: null,
      },
    ],
    idToken: [],
    saml2Token: [],
  },
  parentalControlSettings: {
    countriesBlockedForMinors: [],
    legalAgeGroupRule: "Allow",
  },
  preAuthorizedApplications: [
    {
      appId: "1fec8e78-bce4-4aaf-ab1b-5451cc387264",
      permissionIds: ["5344c933-4245-425e-9d63-1a9b2a1bbb28"],
    },
    {
      appId: "5e3ce6c0-2b1f-4285-8d4b-75ee78787346",
      permissionIds: ["5344c933-4245-425e-9d63-1a9b2a1bbb28"],
    },
  ],
  replyUrlsWithType: [
    {
      type: "Spa",
      url: "https://xxx.test.com",
    },
    {
      type: "Web",
      url: "https://xxx.ngrok.io/api/messages",
    },
    {
      type: "Web",
      url: "https://xxx.azurewebsites.net/auth-end.html",
    },
    {
      type: "Web",
      url: "https://xxx.z13.web.core.windows.net/auth-end.html",
    },
    {
      type: "InstalledClient",
      url: "https://test.com",
    },
  ],
  requiredResourceAccess: [
    {
      resourceAppId: "00000003-0000-0000-c000-000000000000",
      resourceAccess: [
        {
          id: "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
          type: "Scope",
        },
      ],
    },
  ],
  signInUrl: null,
  signInAudience: "AzureADMyOrg",
  tags: [],
  tokenEncryptionKeyId: null,
};
