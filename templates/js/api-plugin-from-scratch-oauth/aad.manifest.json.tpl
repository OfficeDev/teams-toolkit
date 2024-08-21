{
    "id": "${{AAD_APP_OBJECT_ID}}",
    "appId": "${{AAD_APP_CLIENT_ID}}",
    "name": "{{appName}}-aad",
    "accessTokenAcceptedVersion": 2,
    "signInAudience": "AzureADMyOrg",
    "optionalClaims": {
        "idToken": [],
        "accessToken": [
            {
                "name": "idtyp",
                "source": null,
                "essential": false,
                "additionalProperties": []
            }
        ],
        "saml2Token": []
    },
    "oauth2Permissions": [
        {
            "adminConsentDescription": "Allows Copilot to read repair records on your behalf.",
            "adminConsentDisplayName": "Read repairs",
            "id": "${{AAD_APP_ACCESS_AS_USER_PERMISSION_ID}}",
            "isEnabled": true,
            "type": "User",
            "userConsentDescription": "Allows Copilot to read repair records.",
            "userConsentDisplayName": "Read repairs",
            "value": "repairs_read"
        }
    ],
{{#isMicrosoftEntra}}
    "preAuthorizedApplications": [
        {
            "appId": "ab3be6b7-f5df-413d-ac2d-abf1e3fd9c0b",
            "permissionIds": [
                "${{AAD_APP_ACCESS_AS_USER_PERMISSION_ID}}"
            ]
        }
    ],
{{/isMicrosoftEntra}}
    "replyUrlsWithType": [
        {
           "url": "https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect",
           "type": "Web"
        }
    ],    
    "identifierUris": [
        "api://${{AAD_APP_CLIENT_ID}}"
    ]
}