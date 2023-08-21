<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <RuntimeFrameworkVersion>6.0.10</RuntimeFrameworkVersion>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Remove="build/**/*" />
    <Content Remove="build/**/*" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Azure.Identity" Version="1.10.0" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="6.0.0" />
    <PackageReference Include="Microsoft.Graph" Version="5.6.0" />
    <PackageReference Include="Microsoft.Fast.Components.FluentUI" Version="1.5.3" />
    <PackageReference Include="Microsoft.TeamsFx" Version="2.1.*" />
  </ItemGroup>

</Project>
