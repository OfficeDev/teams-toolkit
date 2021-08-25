// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Text.RegularExpressions;

namespace Microsoft.TeamsFx.Helper
{
    static internal class ExceptionHelper
    {
        static internal ExceptionCode ParseExceptionCode(Exception e)
        {
            var errorWithCodePattern = "ErrorWithCode.";
            var rx = new Regex(errorWithCodePattern + @"\w*");
            var match = rx.Match(e.Message);
            if (match.Success)
            {
                var errorCodeString = match.Value.Replace(errorWithCodePattern, "");
                return (ExceptionCode)Enum.Parse(typeof(ExceptionCode), errorCodeString);
            }
            else
            {
                return ExceptionCode.JSRuntimeError;
            }
        }
    }
}
