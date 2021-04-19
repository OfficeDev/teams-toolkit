// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System.Reflection;

namespace Microsoft.TeamsFx.SimpleAuth
{
    public static class GlobalConfig
    {
        public static readonly string SimpleAuthVersion = Assembly.GetExecutingAssembly().GetName().Version.ToString();
    }
}
