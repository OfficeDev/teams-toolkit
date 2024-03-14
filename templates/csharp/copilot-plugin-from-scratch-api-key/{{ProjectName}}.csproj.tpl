<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>{{TargetFramework}}</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <AzureFunctionsVersion>v4</AzureFunctionsVersion>
    <OutputType>Exe</OutputType>
    <RootNamespace>{{SafeProjectName}}</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
{{^isNewProjectTypeEnabled}}
    <ProjectCapability Include="TeamsFx" />
{{/isNewProjectTypeEnabled}}
    <ProjectCapability Include="APIME" />
  </ItemGroup>

{{^isNewProjectTypeEnabled}}
  <ItemGroup>
    <None Remove="build/**/*" />
    <Content Remove="build/**/*" />
  </ItemGroup>

{{/isNewProjectTypeEnabled}}
  <ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="1.20.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.1.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="1.16.2" />
  </ItemGroup>

  <ItemGroup>
    <None Update="host.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
    </None>
    <None Update="local.settings.json">
      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
      <CopyToPublishDirectory>Never</CopyToPublishDirectory>
    </None>
  </ItemGroup>

  <ItemGroup>
    <Using Include="System.Threading.ExecutionContext" Alias="ExecutionContext"/>
  </ItemGroup>

</Project>
