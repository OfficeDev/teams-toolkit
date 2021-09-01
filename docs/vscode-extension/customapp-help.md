# Custom App Permission

To test your app, you need to sign in your Microsoft 365 account with custom app permission enabled.

If your account does not have custom app permission, you may go following ways to enable it:

- Sign up [Microsoft 365 Developer Program](https://developer.microsoft.com/microsoft-365/dev-program).
- Contact to your administrator to setup custom app policy.

## Sign up Microsoft 365 Developer Program

If you do not have a Microsoft 365 account, you must sign up for a [Microsoft 365 Developer Program](https://developer.microsoft.com/microsoft-365/dev-program) subscription. The subscription is free for 90 days and continues to renew as long as you are using it for development activity. If you have a Visual Studio Enterprise or Professional subscription, both programs include a free Microsoft 365 [developer subscription](https://aka.ms/MyVisualStudioBenefits). It is active as long as your Visual Studio subscription is active. For more information, see [set up a Microsoft 365 developer subscription](https://docs.microsoft.com/office/developer-program/office-365-developer-program-get-started).

See [Prepare your Microsoft 365 tenant](https://docs.microsoft.com/microsoftteams/platform/concepts/build-and-test/prepare-your-o365-tenant) for more details.

## Setup Custom App Policy

Administrators can setup both organization-level and user-level app permissions.

### Org-wide custom app setting

1. Sign in [Microsoft Teams admin center](https://admin.teams.microsoft.com/).
2. In the left navigation, go to **Teams apps** > **Manage apps**.
3. Click **Org-wide app settings**.
4. Under **Custom apps**, turn on **Allow interaction with custom apps**.

See [Manage custom app policies and settings in Microsoft Teams](https://docs.microsoft.com/microsoftteams/teams-custom-app-policies-and-settings#org-wide-custom-app-setting) for more details.

### User custom apps policy

1. Sign in [Microsoft Teams admin center](https://admin.teams.microsoft.com/).
2. In the left navigation, go to **Teams apps** > **Setup policies**.
3. Select **Add** to add a new policy or select an existing policy to modify.
4. Turn on **Upload custom apps**.

See [Manage app setup policies in Microsoft Teams](https://docs.microsoft.com/microsoftteams/teams-app-setup-policies#upload-custom-apps) for more details.