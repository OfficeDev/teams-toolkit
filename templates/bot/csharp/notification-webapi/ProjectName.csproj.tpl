<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net6.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <ProjectCapability Include="TeamsFx" />
  </ItemGroup>

  <ItemGroup>
    <None Include=".fx/**/*" />
  </ItemGroup>

  <ItemGroup>
    <None Include=".notification.localstore.json" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="AdaptiveCards.Templating" Version="1.2.2" />
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.16.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.16.0" />
    <PackageReference Include="Microsoft.TeamsFx" Version="0.5.0-rc" />
  </ItemGroup>

</Project>
