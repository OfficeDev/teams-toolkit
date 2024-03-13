<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>{{TargetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <DisableFastUpToDateCheck>true</DisableFastUpToDateCheck>
  </PropertyGroup>

{{^isNewProjectTypeEnabled}}
  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Include="appPackage/**/*" />
    <None Include="infra/**/*" />
    <None Remove="devTools/**" />
    <Content Remove="devTools/**/*" />
  </ItemGroup>

{{/isNewProjectTypeEnabled}}
  <ItemGroup>
    <None Include=".notification.local*.json" />
    <None Include=".notification.testtool*.json" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="AdaptiveCards.Templating" Version="1.3.1" />
    <PackageReference Include="Microsoft.Azure.Functions.Extensions" Version="1.1.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.21.1" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="6.0.0" />
    <PackageReference Include="Microsoft.NET.Sdk.Functions" Version="4.1.3" />
    <PackageReference Include="Microsoft.TeamsFx" Version="2.4.*">
      <!-- Exclude TeamsFx wwwroot static files which are for frontend only. -->
      <ExcludeAssets>contentFiles</ExcludeAssets>
    </PackageReference>
    <!-- Fix system package downgrade -->
    <PackageReference Include="Microsoft.NETCore.Targets" Version="3.1.0" PrivateAssets="All" />
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
    <None Update="appsettings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="appsettings.Development.json">
      <DependentUpon>appsettings.json</DependentUpon>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
    <None Update="appsettings.TestTool.json">
      <DependentUpon>appsettings.json</DependentUpon>
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>

</Project>
