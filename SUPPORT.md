# Support

## Teams Toolkit lifecycle and support policy

The Teams Toolkit lifecycle and support policy covers GA and future versions.

Teams Toolkit products will follow [Modern Lifecycle Policy](https://docs.microsoft.com/en-us/lifecycle/policies/modern) unless otherwise noted.

In addition, we want to add additional support on top of Microsoft standard Modern Lifecycle Policy:

**Teams Toolkit for Visual Studio Code:**

Visual Studio Code is also following [Modern Lifecycle Policy](https://docs.microsoft.com/en-us/lifecycle/policies/modern).

As extension on Visual Studio Code, we would follow Modern Lifecycle Policy add additional support that for any Teams Toolkit for Visual Studio Code major version, we offer 2-year support* since its first release.

**Teams Toolkit for Visual Studio:**

Visual Studio follows the [Fixed Lifecycle Policy](https://docs.microsoft.com/en-us/visualstudio/productinfo/vs-servicing) with a 10-year support of major versions (5 years Mainstream and 5 years Extended), and a [Channel-based support](https://docs.microsoft.com/en-us/visualstudio/productinfo/vs-servicing) for 18 months of minor versions. Since our product is extension to Visual Studio Product, we are not on Visual Studio’s own support policy. but we will offer 2-year support* for major versions, and 18 months for the minor versions. Teams Toolkit for Visual Studio is in sync with the same version of Visual Studio.

**Teams Toolkit CLI & SDK:**

Currently Teams Toolkit CLI/SDK is published as NPM package. From npm package store customer can install any specified version. 

We have a plan to merge back into future consolidated M365 app SDK and will be part of it. Support plan will follow the new SDK. 

For now, we model after [Azure SDK’s lifecycle and support policy](https://azure.github.io/azure-sdk/policies_support.html#:~:text=Active%20%2D%20The%20SDKs%20are%20generally,minor%20versions%2C%20or%20patch%20versions.):

**Package lifecycle**

Here are the stages of a typical package lifecycle (for major versions)
1.	**Beta** – A new SDK/CLI that is available for early access and feedback purposes and is not recommended for use in production. The beta version support is limited to GitHub issues and response time is not guaranteed. Beta releases live typically for less than 1 year, after which they are either deprecated or released as stable.
2.	**Active** - The SDK/CLIs are generally available and fully supported, will receive new feature updates, as well as bug and security fixes. The major version will remain active for at least 12 months from the release date. Compatible updates for the major release are provided through minor versions, or patch versions. Customers are encouraged to use the latest version as that is the version that will get fixes and updates.
3.	**Deprecated** - A library has been superseded by a more recent release. In this case, the current library is deprecated in favor of a newer library. Typically, deprecation occurs at the same time the replacement library is transitioned to Active, after which the releases will only address the most critical bug fixes and security fixes for at least another 12 months.
4.	**Community** – SDK/CLI will no longer receive updates from Microsoft unless otherwise specified in the separate customer agreement. The package will remain available via public package managers and the GitHub repo, which can be maintained by the community.

**CLI/SDK dependencies**

Teams Toolkit CLI and SDK depend on Microsoft Teams Platform, Teams Dev Portal, SharePoint Framework, Microsoft Azure, programming language runtime, OS, and third-party libraries. 

Teams Toolkit CLI/SDK will not be guaranteed to work on platforms and other dependencies that have reached their end of life. Dropping support for such dependencies may be done without increasing the major version of CLI/SDK. We strongly recommend migration to supported platforms and other dependencies to be eligible for technical support.


*support means we apply critical patches, fix critical bugs, but do not add new features.*

## Version mapping

| | Teams Toolkit for Visual Studio Code|Teams Toolkit for Visual Studio| Teams Toolkit CLI | TeamsFx SDK |Teams SDK|Manifest|
|----|----|----|----|----|----|----|
|Public Preview|v3.8.x|v17.2|v0.14.x|v0.7.x|v1.11.x,v1.12.x|v1.11|
|GA|v4.0.0|v17.3|v1.0.0|v1.0.0|v1.12.x|v1.11|
|Beta*|v4.0.0|v17.3|v1.0.0|v2.0.0-beta|v2.0.0|m365DevPreview|

*Enable extending Teams apps across Microsoft 365

## How to file issues and get help  

This project uses *GitHub Issues* and *StackOverflow questions* to track bugs and feature requests. Please search the [github existing 
issues](https://github.com/OfficeDev/TeamsFx/issues) and/or [`teams-toolkit` tag on StackOverflow](https://stackoverflow.com/questions/tagged/teams-toolkit) before filing any new issues to avoid duplicates. 

For new issues, file your bug or feature request as a new github Issue or post questions on StackOverflow using tag `teams-toolkit`.


## Microsoft Support Policy  

Support for this repository is limited to the resources listed above.
