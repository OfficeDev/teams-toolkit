using System.Collections;
using Microsoft.TeamsFx.SimpleAuth.Tests.Helpers;
using NUnit.Framework;

namespace Microsoft.TeamsFx.SimpleAuth.Tests
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
