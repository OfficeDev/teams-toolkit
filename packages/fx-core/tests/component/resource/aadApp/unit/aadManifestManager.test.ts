import "mocha";
import * as chai from "chai";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import axios from "axios";
import fs from "fs-extra";
import { AadManifestHelper } from "../../../../../src/component/resource/aadApp/utils/aadManifestHelper";
import { AadAppManifestManager } from "../../../../../src/component/resource/aadApp/aadAppManifestManager";
import { AADManifest } from "../../../../../src/component/resource/aadApp/interfaces/AADManifest";
import { UserError } from "@microsoft/teamsfx-api";

describe("AAD manifest manager test", () => {
  const sandbox = sinon.createSandbox();
  afterEach(async () => {
    sandbox.restore();
  });

  it("create and update aad app", async () => {
    fakeAadManifest.id = "";
    fakeAadManifest.appId = "";
    fakeAadManifest.identifierUris = ["api://test-" + uuidv4()];
    const fakeAxiosInstance = axios.create();
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(fakeAxiosInstance, "post").resolves({
      status: 200,
      data: AadManifestHelper.manifestToApplication(fakeAadManifest),
    });

    let responseManifest = await AadAppManifestManager.createAadApp(fakeToken, fakeAadManifest);

    fakeAadManifest.id = responseManifest.id;
    fakeAadManifest.appId = responseManifest.appId;
    chai.expect(responseManifest).to.be.deep.equal(fakeAadManifest);

    sandbox.stub(fakeAxiosInstance, "patch").resolves({
      status: 204,
    });

    fakeAadManifest.name = "updated-fake-name";
    responseManifest = await AadAppManifestManager.updateAadApp(fakeToken, fakeAadManifest);

    chai.expect(responseManifest).to.be.deep.equal(fakeAadManifest);
  });

  it("get aad app manifest", async () => {
    fakeAadManifest.id = "fake-object-id";
    const fakeAxiosInstance = axios.create();
    sandbox.stub(axios, "create").returns(fakeAxiosInstance);
    sandbox.stub(fakeAxiosInstance, "get").resolves({
      status: 200,
      data: AadManifestHelper.manifestToApplication(fakeAadManifest),
    });
    const responseManifest = await AadAppManifestManager.getAadAppManifest(
      fakeToken,
      fakeAadManifest.id
    );
    chai.expect(responseManifest.id).equal(fakeAadManifest.id);
  });

  it("load manifest", async () => {
    const fakeStateMap: Map<string, any> = new Map();
    fakeStateMap.set("fx-resource-aad-app-for-teams", {});
    const mockContext: any = {
      root: "fake-root",
      envInfo: {
        state: fakeStateMap,
        config: null,
      },
    };

    fakeAadManifest.id = "fake-aad-object-id";
    fakeAadManifest.appId = "fake-aad-client-id";
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(fakeAadManifest) as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const loadedManifest = await AadAppManifestManager.loadAadManifest(mockContext);
    chai.expect(loadedManifest).to.be.deep.equal(fakeAadManifest);
  });

  it("load manifest for reply url with custom schema", async () => {
    const fakeStateMap: Map<string, any> = new Map();
    fakeStateMap.set("fx-resource-aad-app-for-teams", {});
    const mockContext: any = {
      root: "fake-root",
      envInfo: {
        state: fakeStateMap,
        config: null,
      },
    };

    fakeAadManifest.id = "fake-aad-object-id";
    fakeAadManifest.appId = "fake-aad-client-id";
    const customRedirectUrl = [
      {
        type: "InstalledClient",
        url: "customSchema://test.com",
      },
      {
        type: "InstalledClient",
        url: "msal8a7a479f-c0d0-4ee4-8da9-819a71387ca5://auth",
      },
      {
        type: "Web",
        url: "http://localhost",
      },
      {
        type: "Web",
        url: "https://{{WILL_BE_IGNORED}}",
      },
      {
        type: "InstalledClient",
        url: "custom://{{WILL_BE_IGNORED}}",
      },
    ];
    fakeAadManifest.replyUrlsWithType = customRedirectUrl;
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(fakeAadManifest) as any);
    sandbox.stub(fs, "pathExists").resolves(true);
    const loadedManifest = await AadAppManifestManager.loadAadManifest(mockContext);

    console.log(loadedManifest);
    chai.assert.equal(loadedManifest.replyUrlsWithType.length, 3);

    for (let i = 0; i < loadedManifest.replyUrlsWithType.length; i++) {
      chai.assert.equal(loadedManifest.replyUrlsWithType[i].type, customRedirectUrl[i].type);
      chai.assert.equal(loadedManifest.replyUrlsWithType[i].url, customRedirectUrl[i].url);
    }
  });

  it("load manifest failed with unknown resource id error should throw user error", async () => {
    const fakeStateMap: Map<string, any> = new Map();
    fakeStateMap.set("fx-resource-aad-app-for-teams", {});
    const mockContext: any = {
      root: "fake-root",
      envInfo: {
        state: fakeStateMap,
        config: null,
      },
    };

    fakeAadManifest.id = "fake-aad-object-id";
    fakeAadManifest.appId = "fake-aad-client-id";
    fakeAadManifest.requiredResourceAccess.push({
      resourceAppId: "00000003-0000-0000-c000-000000000000",
      resourceAccess: [
        {
          id: "invalid-resource-id",
          type: "Scope",
        },
      ],
    });
    sandbox.stub(fs, "readFile").resolves(JSON.stringify(fakeAadManifest) as any);
    sandbox.stub(fs, "pathExists").resolves(true);

    try {
      await AadAppManifestManager.loadAadManifest(mockContext);
    } catch (err) {
      chai.assert.isTrue(err instanceof UserError);
      return;
    }
    throw new Error("Unknown resource id error doesn't throw");
  });
});

const fakeToken = "fake-token";

const fakeAadManifest: AADManifest = {
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
  identifierUris: [],
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
