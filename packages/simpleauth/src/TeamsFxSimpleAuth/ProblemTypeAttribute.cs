// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System;

namespace Microsoft.TeamsFx.SimpleAuth
{
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
    public class ProblemTypeAttribute : Attribute
    {
        public string ProblemType { get; private set; }

        public ProblemTypeAttribute(string type)
        {
            ProblemType = type;
        }
    }
}
