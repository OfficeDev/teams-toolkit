# How to create a free M365 test tenant?

M365 test tenant is to get you an instant sandbox of Microsoft 365 developer environment. Instead of making you provison all your Microsoft 365 apps and install your data packs one by one, it contains pre-installed sample data packs so you can quickly work on this tenant.

## Prequisitives

- A personal Microsoft account, or a work or school account.

## Steps to create instant sandbox

- Sign In [Microsoft 365 Dev program](https://developer.microsoft.com/en-us/microsoft-365/dev-program) with your personal Microsoft account or your work or school account.

![Sign in](./m365.png)

If you don't have a personal Microsoft account, or a work or school account. You can click `Create one` to create an account.

![Create account](./createone.png)

>Note: You cannot Sign in with *.onmicrosoft.com account, otherwise you will meet following error in next step.

![Sign in with wrong account](./joinnowerror.png)

- Click `Join now`, this will navigate you to instant sandbox creation page.

![Join now](./joinnow.png)

- (Optional) If you already have a normal subscription before, you can click `Start` button on dashboard page to setup an instant sandbox.

![questions](./withnormalsubscription.png)

- Answer some questions to customize your Developer Program experience

![questions](./m365questions1.png)

![questions2](./m365questions2.png)

- Setup your Microsoft 365 E5 sandbox

![setup m365 sandbox](./setupm365.png)

![setup m365 sandbox step 2](./setupm3652.png)

- You may need to add a phone number for security verification.

![Phone verification](./phoneverification.png)

- Now you have an instant sandbox. You can `sign in Teams Toolkit with admin or users account in this tenant`.

![Instant sandbox](./m365-dev-program-instant-sandbox.png)

## Turn on sideloading option

- Sign in to [Teams Admin Center](https://admin.teams.microsoft.com) with your admin credentials.

- Navigate to `Teams apps > Setup Policies > Global`.

- Toggle `Upload custom apps` to the `On` position.

![Instant sandbox](./turn-on-sideload.png)

- Select `Save`.

>Note: It can take up to 24 hours for the sideloading option to be active.
