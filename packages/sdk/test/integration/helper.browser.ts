// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import axios from 'axios';
/* ... */
export async function getSSOToken(): Promise<string>  {
    const env = (window as any).__env__;
    let details = {
        username: env.SDK_INTEGRATION_TEST_ACCOUNT_NAME,
        password: env.SDK_INTEGRATION_TEST_ACCOUNT_PASSWORD,
        client_id: env.SDK_INTEGRATION_TEST_TEAMS_AAD_CLIENT_ID,
        scope: env.SDK_INTEGRATION_TEST_TEAMS_ACCESS_AS_USER_SCOPE,
        grant_type: 'password'
    };
    let formBody = [];
    for (let [key ,value] of Object.entries(details)) {
        let encodedKey = encodeURIComponent(key);
        let encodedValue = encodeURIComponent(value);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    const body = formBody.join("&");
    const response =  await axios.post(`https://login.microsoftonline.com/${env.SDK_INTEGRATION_TEST_AAD_TENANT_ID}/oauth2/v2.0/token`,
    body,{
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
    });
    return (response.data as any)["access_token"];
}
