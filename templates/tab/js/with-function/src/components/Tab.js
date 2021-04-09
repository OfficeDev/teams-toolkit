// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import React from 'react';
import './App.css';
import { teamsfx } from 'teamsdev-client';
import { Button } from '@fluentui/react-northstar'

/**
 * The 'PersonalTab' component renders the main tab content
 * of your app.
 */
class Tab extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      userInfo: {},
      profile: {},
      photoObjectURL: '',
      fetchPhotoErrorMessage: '',
      showLoginBtn: false,
      showGraphMessage: false,
      functionMessage: '',
      functionErrorMessage: '',
      showFunctionMessage: false
    }
  }

  //React lifecycle method that gets called once a component has finished mounting
  //Learn more: https://reactjs.org/docs/react-component.html#componentdidmount
  async componentDidMount() {
    // Next steps: Error handling using the error object
    await this.initTeamsFx();
    await this.callGraphSilent();
  }

  async initTeamsFx() {
    var teamsfxEndpoint = process.env.REACT_APP_TEAMSFX_ENDPOINT;
    var startLoginPageUrl = process.env.REACT_APP_START_LOGIN_PAGE_URL;
    var functionEndpoint = process.env.REACT_APP_FUNC_ENDPOINT;
    await teamsfx.init(teamsfxEndpoint, startLoginPageUrl, functionEndpoint);
    var userInfo = teamsfx.getUserInfo();
    this.setState({
      userInfo: userInfo
    });
  }

  async callGraphSilent() {
    try {
      var graphClient = await teamsfx.getMicrosoftGraphClient();
      var profile = await graphClient.api('/me').get();

      var message = '';
      var funcErrorMsg = '';
      var showFunctionMessage = false;

      try {
        var functionName = process.env.REACT_APP_FUNC_NAME || 'myFunc';
        var messageJson = await teamsfx.callFunction(functionName, 'post', 'hello');
        message = JSON.stringify(messageJson, undefined, 2);
      } catch (err) {
        if (err.response && err.response.status && err.response.status === 404) {
          funcErrorMsg = 'There may be a problem with the deployment of Azure Function App, please deploy Azure Function (Run command palette "TeamsFx - Deploy Package") first before running this App';
        } else if (err.message === 'Network Error') {
          funcErrorMsg = 'Cannot call Azure Function due to network error, please check your network connection status and ';
          if (err.config.url.indexOf('localhost') >= 0) {
            funcErrorMsg += 'make sure to start Azure Function locally (Run "npm run start" command inside api folder from terminal) first before running this App';
          }
          else {
            funcErrorMsg += 'make sure to provision and deploy Azure Function (Run command palette "TeamsFx - Provision Resource" and "TeamsFx - Deploy Package") first before running this App';
          }
        } else {
          funcErrorMsg = err.toString();
          if (err.response?.data?.error) {
            funcErrorMsg += ': ' + err.response.data.error;
          }
        }
      }
      showFunctionMessage = true;

      this.setState({
        profile: profile,
        showGraphMessage: true,
        showFunctionMessage: showFunctionMessage,
        functionMessage: message,
        functionErrorMessage: funcErrorMsg
      })

      try {
        var photoBlob = await graphClient.api('/me/photo/$value').get();
        this.setState({
          photoObjectURL: URL.createObjectURL(photoBlob),
        });
      } catch (error) {
        this.setState({
          fetchPhotoErrorMessage: 'Could not fetch photo from your profile, you need to add photo in the profile settings first: ' + error.message
        });
      }
    }
    catch (err) {
      this.setState({
        showLoginBtn: true,
        showGraphMessage: false
      });
    }
  }

  async loginBtnClick() {
    try {
      await teamsfx.popupLoginPage();
    }
    catch (err) {
      alert('Login failed: ' + err);
      return;
    }
    this.setState({
      showLoginBtn: false
    });
    await this.callGraphSilent();
  }

  render() {
    return (
      <div>
        <h2>Basic info from SSO</h2>
        <p><b>Name:</b> {this.state.userInfo.userName}</p>
        <p><b>E-mail:</b> {this.state.userInfo.preferredUserName}</p>

        {this.state.showLoginBtn && <Button content='Grant permission & get information' onClick={() => this.loginBtnClick()} primary />}

        {
          this.state.showGraphMessage &&
          <p>
            <h2>Profile from Microsoft Graph</h2>
            <div>
              <div><b>Name:</b> {this.state.profile.displayName}</div>
              <div><b>Job title:</b> {this.state.profile.jobTitle}</div>
              <div><b>E-mail:</b> {this.state.profile.mail}</div>
              <div><b>UPN:</b> {this.state.profile.userPrincipalName}</div>
              <div><b>Object id:</b> {this.state.profile.id}</div>
            </div>
            <h2>User Photo from Microsoft Graph</h2>
            <div >
              {this.state.photoObjectURL && <img src={this.state.photoObjectURL} alt='Profile Avatar' />}
              {this.state.fetchPhotoErrorMessage && <div>{this.state.fetchPhotoErrorMessage}</div>}
            </div>
          </p>
        }

        {
          this.state.showFunctionMessage &&
          <p>
            <h2>Message from Azure Function: {process.env.REACT_APP_FUNC_ENDPOINT}</h2>
            <div>
              {this.state.functionMessage &&<pre>{this.state.functionMessage}</pre> }
              {this.state.functionErrorMessage && <div>{this.state.functionErrorMessage}</div>}
            </div>
          </p>
        }
      </div>
    );
  }
}
export default Tab;
