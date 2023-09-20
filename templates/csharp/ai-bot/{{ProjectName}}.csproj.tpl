<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Remove="build/**/*" />
    <Content Remove="build/**/*" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.20.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.20.0" />
    <PackageReference Include="Microsoft.TeamsAI" Version="1.0.*-*" />
  </ItemGroup>

  <ItemGroup>
    <Content Include="Prompts\Chat\skprompt.txt">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>PreserveNewest</CopyToPublishDirectory>
    </Content>
  </ItemGroup>

  <!-- Exclude Teams Toolkit files from build output, but can still be viewed from Solution Explorer -->
  <ItemGroup>
    <Content Remove="appPackage/**/*" />
    <None Include="appPackage/**/*" />
    <None Include="env/**/*" />
    <Content Remove="infra/**/*" />
    <None Include="infra/**/*" />
  </ItemGroup>

  <!-- Exclude local settings from publish -->
  <ItemGroup>
    <Content Remove="appsettings.Development.json" />
    <Content Include="appsettings.Development.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>None</CopyToPublishDirectory>
    </Content>
  </ItemGroup>

</Project>
