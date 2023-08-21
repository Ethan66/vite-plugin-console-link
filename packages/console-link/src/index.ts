import { getSpliceCode } from './core/index'
const consoleLink = (
  options = { open: false }
): {
  name: string
  enforce: 'pre' | 'post' | undefined
  transform: (code: any, filePath: any) => {}
} => {
  return {
    name: 'console-link',
    enforce: 'pre',
    transform: (code, filePath) => {
      if (!options.open) return code
      if (filePath.includes('node_modules')) return code
      const extension = filePath.replace(/^.+\./, '')
      if (!['vue', 'js', 'ts'].includes(extension)) return code
      if (extension === 'vue') {
        const scriptIndex = code.indexOf('<script')
        const scriptLastIndex = code.indexOf('</script>')
        return (
          code.slice(0, scriptIndex) +
          getSpliceCode(code.slice(scriptIndex, scriptLastIndex)) +
          code.slice(scriptLastIndex)
        )
        console.warn('----- my data is code.length: ', code.length)
        // console.warn('----- my data is code: ', code)
      }
      return code
    }
  }
}

export default consoleLink
