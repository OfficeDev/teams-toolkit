// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace Microsoft.TeamsFx.Test;

[TestClass]
public class AccessTokenTest
{
    [TestMethod]
    public void TestNearExpiration()
    {
        var time1 = DateTimeOffset.Now + new TimeSpan(0, 5, 5);
        var token = new Model.AccessToken("", time1);
        Assert.IsFalse(token.NearExpiration());

        var time2 = DateTimeOffset.Now + new TimeSpan(0, 4, 55);
        token = new Model.AccessToken("", time2);
        Assert.IsTrue(token.NearExpiration());
    }
}
