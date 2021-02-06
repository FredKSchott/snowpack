const{transformToBuildFileName} = require('../../../snowpack/lib/build/file-urls')

describe('transformToBuildFileName()', () => {
  const TEST_CONFIG = {
    _extensionMap: {
      '.one': ['.js'],
      '.many': ['.js', '.css']
    }
  }

  test('file extension with 1:1 mapping is replaced', () => {
    const fileName = 'filename.one'

    const buildFileName = transformToBuildFileName(fileName, TEST_CONFIG)

    expect(buildFileName).toBe('filename.js')
  })


  test('file extension with 1:1 mapping is replaced with custom extension', () => {
    const fileName = 'filename.one'
    const customExtension = '.custom'

    const buildFileName = transformToBuildFileName(fileName, TEST_CONFIG, customExtension)

    expect(buildFileName).toBe('filename.custom')
  })

  test('file extension with 1:N mapping is appened', () => {
    const fileName = 'filename.many'

    const buildFileName = transformToBuildFileName('filename.many', TEST_CONFIG)

    expect(buildFileName).toBe('filename.many.js')
  })


  test('file extension with 1:N mapping is appened with custom extension', () => {
    const fileName = 'filename.many'
    const customExtension = '.custom'

    const buildFileName = transformToBuildFileName(fileName, TEST_CONFIG, customExtension)

    expect(buildFileName).toBe('filename.many.custom')
  })
})
