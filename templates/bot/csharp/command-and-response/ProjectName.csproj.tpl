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
    <None Remove="build/**/*" />
    <Content Remove="build/**/*" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="AdaptiveCards.Templating" Version="1.2.2" />
    <PackageReference Include="Microsoft.Bot.Builder" Version="4.16.0" />
    <PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.16.0" />
    <PackageReference Include="Microsoft.TeamsFx" Version="1.0.0">
      <!-- Exclude TeamsFx wwwroot static files which are for frontend only. -->
      <ExcludeAssets>contentFiles</ExcludeAssets>
    </PackageReference>
  </ItemGroup>

</Project>
