module.exports = function ({ types: t }) {
  return {
    visitor: {
      FunctionDeclaration(path) {
        if (t.isBlockStatement(path.node.body)) {
          const functionName = path.node.id ? path.node.id.name : ''
          const params = getParams(path, t)
          const consoleLogStatement = getConsoleLog(functionName, params, t)
          path.node.body.body.unshift(consoleLogStatement)
        }
      },
      FunctionExpression(path) {
        if (t.isBlockStatement(path.node.body)) {
          const functionName = path.node.id ? path.node.id.name : 'anonymous'
          const params = getParams(path, t)
          const consoleLogStatement = getConsoleLog(functionName, params, t)
          path.node.body.body.unshift(consoleLogStatement)
        }
      },
      ArrowFunctionExpression(path) {
        if (t.isBlockStatement(path.node.body)) {
          const functionName = getVariableName(path, t)
          const params = getParams(path, t)
          const consoleLogStatement = getConsoleLog(functionName, params, t)
          path.node.body.body.unshift(consoleLogStatement)
        }
      },
      ClassMethod(path) {
        if (t.isBlockStatement(path.node.body)) {
          const functionName = path.node.key ? path.node.key.name : ''
          const params = getParams(path, t)
          const consoleLogStatement = getConsoleLog(functionName, params, t)
          path.node.body.body.unshift(consoleLogStatement)
        }
      }
    }
  }
}

function getVariableName(path, t) {
  if (path.parent && t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
    return path.parent.id ? path.parent.id.name : ''
  }
  return 'anonymous'
}

function getParams(path, t) {
  return path.node.params.map((param) => {
    if (t.isRestElement(param)) {
      // 处理 rest 参数
      return t.stringLiteral('...' + param.argument.name)
    } else if (t.isAssignmentPattern(param)) {
      // 形参带有默认值
      return t.stringLiteral(param.left.name)
    } else {
      return t.stringLiteral(param.name)
    }
  })
}

function getConsoleLog(functionName, params, t) {
  return t.expressionStatement(
    t.callExpression(t.memberExpression(t.identifier('console'), t.identifier('warn')), [
      t.stringLiteral(`Function: ${functionName}`),
      ...params
    ])
  )
}

/* 
vue-cli4 vue.config.js配置
const consoleLogBabel = require('./my-babel/babel')
config.module.rule('js').use('babel-loader').tap(options => {
    if (!options) {
      options = {}
    }
    console.warn('----- my data is options: ', options)
    options.plugins = [consoleLogBabel]
    return options
  })
*/

/* 
vue-cli5 vue.config.js配置
const consoleLogBabel = require('./my-babel/babel')
chainWebpack(config) {
    const jsRule = config.module.rule('js');

    // 清除已有的 "rule" 规则
    jsRule.uses.clear();
    jsRule
      .test(/\.js$/)
      .include.add(path.resolve(__dirname, 'src')).end()
      .use("babel-loader")
      .loader("babel-loader")
      .tap((options) => {
        if (!options) {
          options = {};
        }
        console.warn("----- my data is options: ", options);
        options.plugins = [consoleLogBabel];
        return options;
      });
  },
 */
