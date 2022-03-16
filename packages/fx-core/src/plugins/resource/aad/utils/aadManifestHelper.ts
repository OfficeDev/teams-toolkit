import { AADApplication } from "../interfaces/AADApplication";
import { AADManifest } from "../interfaces/AADManifest";

export class AadManifestHelper {
  public static manifestToApplication(manifest: AADManifest): AADApplication {
    const result: AADApplication = {
      id: manifest.id,
      appId: manifest.appId,
      disabledByMicrosoftStatus: manifest.disabledByMicrosoftStatus,
      displayName: manifest.name,
      description: manifest.description,
      groupMembershipClaims: manifest.groupMembershipClaims,
      identifierUris: manifest.identifierUris,
      isFallbackPublicClient: manifest.allowPublicClient,
      notes: manifest.notes,
      signInAudience: manifest.signInAudience,
      tags: manifest.tags,
      tokenEncryptionKeyId: manifest.tokenEncryptionKeyId,
      addIns: manifest.addIns,
      api: {
        acceptMappedClaims: manifest.acceptMappedClaims,
        knownClientApplications: manifest.knownClientApplications,
        requestedAccessTokenVersion: manifest.accessTokenAcceptedVersion,
        oauth2PermissionScopes: manifest.oauth2Permissions,
        preAuthorizedApplications: manifest.preAuthorizedApplications.map((item) => {
          return { appId: item.appId, delegatedPermissionIds: item.permissionIds };
        }),
      },
      appRoles: manifest.appRoles,
      info: {
        marketingUrl: manifest.informationalUrls.marketing,
        privacyStatementUrl: manifest.informationalUrls.privacy,
        supportUrl: manifest.informationalUrls.support,
        termsOfServiceUrl: manifest.informationalUrls.termsOfService,
      },
      keyCredentials: manifest.keyCredentials.map((item) => {
        return {
          customKeyIdentifier: item.customKeyIdentifier,
          displayName: item.displayName,
          endDateTime: item.endDate,
          key: item.value,
          keyId: item.keyId,
          startDateTime: item.startDate,
          type: item.type,
          usage: item.usage,
        };
      }),
      optionalClaims: manifest.optionalClaims,
      parentalControlSettings: manifest.parentalControlSettings,
      passwordCredentials: manifest.passwordCredentials,
      publicClient: {
        redirectUris: manifest.replyUrlsWithType
          .filter((item) => item.type === "InstalledClient")
          .map((item) => item.url),
      },
      requiredResourceAccess: manifest.requiredResourceAccess,
      web: {
        homePageUrl: manifest.signInUrl,
        logoutUrl: manifest.logoutUrl,
        redirectUris: manifest.replyUrlsWithType
          .filter((item) => item.type === "Web")
          .map((item) => item.url),
        implicitGrantSettings: {
          enableIdTokenIssuance: manifest.oauth2AllowIdTokenImplicitFlow,
          enableAccessTokenIssuance: manifest.oauth2AllowImplicitFlow,
        },
      },
      spa: {
        redirectUris: manifest.replyUrlsWithType
          .filter((item) => item.type === "Spa")
          .map((item) => item.url),
      },
    };

    return result;
  }

  public static applicationToManifest(app: AADApplication): AADManifest {
    const result: AADManifest = {
      id: app.id,
      appId: app.appId,
      acceptMappedClaims: app.api.acceptMappedClaims,
      accessTokenAcceptedVersion: app.api.requestedAccessTokenVersion,
      addIns: app.addIns,
      allowPublicClient: app.isFallbackPublicClient,
      appRoles: app.appRoles,
      description: app.description,
      disabledByMicrosoftStatus: app.disabledByMicrosoftStatus,
      groupMembershipClaims: app.groupMembershipClaims,
      identifierUris: app.identifierUris,
      informationalUrls: {
        termsOfService: app.info.termsOfServiceUrl,
        support: app.info.supportUrl,
        privacy: app.info.privacyStatementUrl,
        marketing: app.info.marketingUrl,
      },
      keyCredentials: app.keyCredentials.map((item) => {
        return {
          customKeyIdentifier: item.customKeyIdentifier,
          endDate: item.endDateTime,
          keyId: item.keyId,
          startDate: item.startDateTime,
          type: item.type,
          usage: item.usage,
          value: item.key,
          displayName: item.displayName,
        };
      }),
      knownClientApplications: app.api.knownClientApplications,
      logoutUrl: app.web.logoutUrl,
      name: app.displayName,
      notes: app.notes,
      oauth2AllowIdTokenImplicitFlow: app.web.implicitGrantSettings.enableIdTokenIssuance,
      oauth2AllowImplicitFlow: app.web.implicitGrantSettings.enableIdTokenIssuance,
      oauth2Permissions: app.api.oauth2PermissionScopes,
      optionalClaims: app.optionalClaims,
      parentalControlSettings: app.parentalControlSettings,
      passwordCredentials: app.passwordCredentials,
      preAuthorizedApplications: app.api.preAuthorizedApplications.map((item) => {
        return {
          appId: item.appId,
          permissionIds: item.delegatedPermissionIds,
        };
      }),
      replyUrlsWithType: app.spa.redirectUris
        .map((item) => {
          return {
            type: "Spa",
            url: item,
          };
        })
        .concat(
          app.web.redirectUris.map((item) => {
            return {
              type: "Web",
              url: item,
            };
          })
        )
        .concat(
          app.publicClient.redirectUris.map((item) => {
            return {
              type: "InstalledClient",
              url: item,
            };
          })
        ),
      requiredResourceAccess: app.requiredResourceAccess,
      signInUrl: app.web.homePageUrl,
      signInAudience: app.signInAudience,
      tags: app.tags,
      tokenEncryptionKeyId: app.tokenEncryptionKeyId,
    };

    return result;
  }
}
