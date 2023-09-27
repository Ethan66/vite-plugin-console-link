const { RawSource } = require('webpack-sources')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generator = require('@babel/generator').default
const template = require('@babel/template')

class ConsoleLogPlugin {
  apply(compiler) {
    console.warn('----- my data is 0: ', 0)
    compiler.hooks.compilation.tap('ConsoleLogPlugin', (compilation) => {
      compilation.hooks.optimizeChunkAssets.tapAsync('ConsoleLogPlugin', (chunks, callback) => {
        chunks.forEach((chunk) => {
          console.warn('----- my data is 11: ', 11)
          chunk.files.forEach((file) => {
            console.warn('----- my data is 22: ', 22)
            if (file.endsWith('.js')) {
              console.warn('----- my data is 33: ', 33)
              const asset = compilation.assets[file]
              const originalSource = asset.source()
              const modifiedSource = this.insertConsoleLogInFunctions(originalSource)
              compilation.assets[file] = new RawSource(modifiedSource)
            }
          })
        })
        callback()
      })
    })
  }

  insertConsoleLogInFunctions(source) {
    const ast = parser.parse(source, {
      sourceType: 'module',
      plugins: ['jsx']
    })

    traverse(ast, {
      FunctionDeclaration(path) {
        this.insertConsoleLog(path.get('body'))
      },
      FunctionExpression(path) {
        this.insertConsoleLog(path.get('body'))
      },
      ArrowFunctionExpression(path) {
        this.insertConsoleLog(path.get('body'))
      },
      ClassMethod(path) {
        this.insertConsoleLog(path.get('body'))
      }
    })

    const { code } = generator(ast)
    return code
  }

  insertConsoleLog(bodyPath) {
    const params = bodyPath.get('params')
    const consoleLogStatement = template.statement(
      `console.log(${params.map((param) => param.toString()).join(', ')})`
    )

    bodyPath.unshiftContainer('body', consoleLogStatement())
  }
}

module.exports = ConsoleLogPlugin
