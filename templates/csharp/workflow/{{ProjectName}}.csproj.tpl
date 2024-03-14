<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>{{TargetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
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
    <PackageReference Include="AdaptiveCards.Templating" Version="1.3.1" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.21.1" />
    <PackageReference Include="Microsoft.TeamsFx" Version="2.4.*">
      <!-- Exclude TeamsFx wwwroot static files which are for frontend only. -->
      <ExcludeAssets>contentFiles</ExcludeAssets>
    </PackageReference>
  </ItemGroup>

</Project>
