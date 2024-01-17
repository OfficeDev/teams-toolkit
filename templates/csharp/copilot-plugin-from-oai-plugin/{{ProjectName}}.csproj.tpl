<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>{{TargetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
    <ProjectCapability Include="APIME" />
  </ItemGroup>

  <ItemGroup>
    <None Include="appPackage/**/*" />
  </ItemGroup>

</Project>
