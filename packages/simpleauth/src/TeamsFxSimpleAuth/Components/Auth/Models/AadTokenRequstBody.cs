// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System.Collections.Generic;
using System.ComponentModel;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Models
{
    public class AadTokenRequstBody
    {
        public string client_id { get; set; }
        public string scope { get; set; }
        public string redirect_uri { get; set; }
        public string grant_type { get; set; }
        public string client_secret { get; set; }
        public string code { get; set; }
        public string code_verifier { get; set; }

        public Dictionary<string, string> ToDictionary()
        {
            var dictionary = new Dictionary<string, string>();
            foreach (PropertyDescriptor property in TypeDescriptor.GetProperties(this))
            {
                var value = (string)property.GetValue(this);
                if (!string.IsNullOrEmpty(value))
                {
                    dictionary.Add(property.Name, value);
                }
            }

            return dictionary;
        }
    }
}
