using System.Collections;
using Microsoft.TeamsFxSimpleAuth.Tests.Helpers;
using NUnit.Framework;

namespace Microsoft.TeamsFxSimpleAuth.Tests
{
    [SetUpFixture]
    public class AadInstanceSetUp
    {
        public static AadInstance<Startup> defaultAadInstance;

        [OneTimeSetUp]
        public void SetupDefaultAadInstance()
        {
            defaultAadInstance = new AadInstance<Startup>();
            defaultAadInstance.InitializeAsync().GetAwaiter().GetResult();
        }

        [OneTimeTearDown]
        public void TearDownDefaultAadInstance()
        {
            defaultAadInstance.DisposeAsync().GetAwaiter().GetResult();
        }
    }
}
