<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Include=".fx/**/*" />
    <None Remove="build/**/*" />
    <Content Remove="build/**/*" />
  </ItemGroup>

  <ItemGroup>
    <None Include=".notification.localstore.json" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="AdaptiveCards.Templating" Version="1.2.2" />
    <PackageReference Include="Microsoft.Azure.Functions.Extensions" Version="1.1.0" />
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.16.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.16.0" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="6.0.0" />
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="4.0.1" />
    <PackageReference Include="Microsoft.TeamsFx" Version="0.5.0">
      <!-- Exclude TeamsFx wwwroot static files which are for frontend only. -->
      <ExcludeAssets>contentFiles</ExcludeAssets>
    </PackageReference>
  </ItemGroup>

  <ItemGroup>
    <Content Include="Resources/*.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </Content>
  </ItemGroup>

  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
    <None Update="appsettings.Development.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>

</Project>
