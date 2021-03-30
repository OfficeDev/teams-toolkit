## 0.1.1
* Fix bug: token API do not acquire new token when cached token contains '.default' scope
* Fix bug: token with Teams app client id is not accepted by API
* Remove aka.ms link from problem type
* Add logging to the service

## 0.1.0
* Initial release of Simple Auth
* Provide token API for Teams tab app to acquire token for first/third party services
* Provide server side support for OAuth auth code flow in Teams tab app