import { ConfidentialClientApplication, NodeAuthOptions } from "@azure/msal-node";
import { AuthenticationConfiguration } from "../models/configuration";
import { ClientCertificate, getAuthority, parseCertificate } from "./utils";

/**
 * @internal
 */
export function createConfidentialClientApplication(
  authentication: AuthenticationConfiguration
): ConfidentialClientApplication {
  const authority = getAuthority(authentication.authorityHost!, authentication.tenantId!);
  const clientCertificate: ClientCertificate | undefined = parseCertificate(
    authentication.certificateContent
  );

  const auth: NodeAuthOptions = {
    clientId: authentication.clientId!,
    authority: authority,
  };

  if (clientCertificate) {
    auth.clientCertificate = clientCertificate;
  } else {
    auth.clientSecret = authentication.clientSecret;
  }

  return new ConfidentialClientApplication({
    auth,
  });
}
