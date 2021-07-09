import * as fs from 'fs-extra'
import mock from 'mock-fs'
import {Operations} from '../src/operations'
import {BaseError} from '../src/base-error'
import * as path from 'path'
import CommandUtil from '../src/utils/exec'

const projectRoot = '/home/test/'

describe('Test BuildTeamsApp', () => {
  beforeEach(() => {
    mock({
      '/home/test': {
        '.fx': {
          'env.default.json': JSON.stringify({})
        }
      }
    })
  })
  afterEach(() => {
    mock.restore()
  })
  test('[BuildTeamsApp] LanguageError', async () => {
    expect.assertions(1)
    // Arrange
    // Act & Assert
    try {
      await Operations.BuildTeamsApp(projectRoot, ['tabs'])
    } catch (error) {
      expect(error).toBeInstanceOf(BaseError)
    }
  })

  test('[BuildTeamsApp] Happy path', async () => {
    expect.assertions(0)
    // Arrange
    await fs.writeJson(path.join(projectRoot, '.fx', 'env.default.json'), {
      solution: {
        programmingLanguage: 'javascript'
      }
    })

    // Act & Assert
    try {
      await Operations.BuildTeamsApp(projectRoot, ['tabs'])
    } catch (error) {
      expect(true).toBeFalsy() // Should not reach here.
    }
  })
})

describe('Test ProvisionHostingEnvironment', () => {
  test('[ProvisionHostingEnvironment] Happy path', async () => {
    // Arrange
    CommandUtil.Execute = jest.fn().mockReturnValue(0)

    // Act
    const ret = await Operations.ProvisionHostingEnvironment(projectRoot)

    // Assert
    expect(ret).toBe(0)
  })
})

describe('Test DeployToHostingEnvironment', () => {
  test('[DeployToHostingEnvironment] Happy path', async () => {
    // Arrange
    CommandUtil.Execute = jest.fn().mockReturnValue(0)

    // Act
    const ret = await Operations.DeployToHostingEnvironment(projectRoot)

    // Assert
    expect(ret).toBe(0)
  })
})

describe('Test PackTeamsApp', () => {
  test('[PackTeamsApp] Happy path', async () => {
    // Arrange
    CommandUtil.Execute = jest.fn().mockReturnValue(0)

    // Act
    const ret = await Operations.PackTeamsApp(projectRoot)

    // Assert
    expect(ret).toBe(0)
  })
})

describe('Test ValidateTeamsAppManifest', () => {
  test('[ValidateTeamsAppManifest] Happy path', async () => {
    // Arrange
    CommandUtil.Execute = jest.fn().mockReturnValue(0)

    // Act
    const ret = await Operations.ValidateTeamsAppManifest(projectRoot)

    // Assert
    expect(ret).toBe(0)
  })
})

describe('Test PublishTeamsApp', () => {
  test('[PublishTeamsApp] Happy path', async () => {
    // Arrange
    CommandUtil.Execute = jest.fn().mockReturnValue(0)

    // Act
    const ret = await Operations.PublishTeamsApp(projectRoot)

    // Assert
    expect(ret).toBe(0)
  })
})
