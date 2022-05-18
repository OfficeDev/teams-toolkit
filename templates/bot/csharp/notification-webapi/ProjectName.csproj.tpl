<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <Content Remove=".notification.localstore.json" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.16.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.16.0" />
    <PackageReference Include="Microsoft.TeamsFx" Version="0.4.1-rc" />
  </ItemGroup>

</Project>
