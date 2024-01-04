<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>{{TargetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Remove="appPackage/**/*" />
    <None Remove="devTools/**" />
    <Content Remove="appPackage/**/*" />
    <Content Remove="devTools/**/*" />
    <None Include="env/**/*" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.21.1" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.21.1" />
    <PackageReference Include="Microsoft.Teams.AI" Version="1.0.0" />
  </ItemGroup>
</Project>
