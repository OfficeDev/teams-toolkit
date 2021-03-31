using System.Reflection;

namespace Microsoft.TeamsFxSimpleAuth
{
    public static class GlobalConfig
    {
        public static readonly string SimpleAuthVersion = Assembly.GetExecutingAssembly().GetName().Version.ToString();
    }
}
