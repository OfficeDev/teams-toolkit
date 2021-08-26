// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.JSInterop;
using Moq;
using System;

namespace Microsoft.TeamsFx.Test.Helper
{
    internal static class TokenMockHelper
    {
        internal static readonly TeamsUserCredential.AccessTokenJS accessTokenJS
             = new()
             {
                 Token = "TestToken",
                 ExpiresOn = DateTimeOffset.Now
             };

        internal static void MockUpGetEmptyToken(Mock<IJSObjectReference> instanceTask)
        {
            var accessEmptyTokenJS = new TeamsUserCredential.AccessTokenJS()
            {
                Token = "",
                ExpiresOn = DateTimeOffset.Now
            };
            instanceTask.Setup(i => i.InvokeAsync<TeamsUserCredential.AccessTokenJS>("getToken", It.IsAny<object[]>()))
                .ReturnsAsync(() => accessEmptyTokenJS).Verifiable();
        }

        internal static void MockUpGetToken(Mock<IJSObjectReference> instanceTask)
        {
            instanceTask.Setup(i => i.InvokeAsync<TeamsUserCredential.AccessTokenJS>("getToken", It.IsAny<object[]>()))
                .ReturnsAsync(() => accessTokenJS).Verifiable();
        }

        internal static void MockUpGetTokenThrowException(Mock<IJSObjectReference> instanceTask)
        {
            instanceTask.Setup(i => i.InvokeAsync<TeamsUserCredential.AccessTokenJS>("getToken", It.IsAny<object[]>()))
                .Throws(new JSException("ErrorWithCode.ServiceError")).Verifiable(); ;
        }
    }
}
