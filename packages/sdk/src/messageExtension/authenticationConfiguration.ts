// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// AAD configration.
// The common aad configuration should contains "client id", 'tennand id', 'authorityhost'.
// type aadCommonConfiguration = Readonly<Record<'clientId' | 'tenantId' | 'authorityHost', string>>
interface aadCommonConfiguration {
  readonly clientId: string;
  readonly tenantId: string;
  readonly authorityHost: string;
}
// User custom the login configuration.
interface loginConfiguration {
  readonly initiateLoginEndpoint: string;
}
// if User choose the client secret as the authentication configuration, certification content should not be exist.
interface aadUserPasswordConfiguration extends aadCommonConfiguration {
  readonly clientSecret: string;
  readonly certificateContent?: never;
}
// if User choose the certification content as the authentication configuration, client secret should not be exist.
interface aadCertificationConfiguration extends aadCommonConfiguration {
  readonly certificateContent: string;
  readonly clientSecret?: never;
}
// User choose the user password authentication configuration or certification authentication configuration.
type aadAuthenticationConfig = aadCertificationConfiguration | aadUserPasswordConfiguration;
// combine the aad authentication config and login configuration.
export type msgExtAuthenticationConfig = aadAuthenticationConfig & loginConfiguration;
