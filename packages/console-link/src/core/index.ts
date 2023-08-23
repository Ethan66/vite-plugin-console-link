import {
  NATIVE_MAP_METHODS,
  NEW_NATIVE_MAP_METHODS,
  prefixFn,
  prefixArg,
  setConsoleColor
} from './config'

// 空函数和已打印过的就不打印了
const isShouldConsole = (fnContext: string) => {
  const match = fnContext.match(/\S+/)
  if (match) {
    if (match[0].startsWith('}')) return false
    if (match[0].startsWith("console.log('%c")) {
      // 打印过的不需要再打印
      return false
    } else {
      return true
    }
  } else {
    return false
  }
}

// 处理fnName
const getPureFnName = (fnName: string) => {
  let result = ''
  const tempName = fnName.replace(/^.*?([\w_\s=]+)$/, '$1')
  if (tempName.endsWith('then')) {
    result = fnName
    return result
  } else {
    result = tempName
    const temp = tempName.split('=')
    // 说明是function fn(){} 或者{ fn(a, b) {}}
    if (temp.length === 1) {
      result = temp[0].replace(/^.*?(?:function)?\s*([\w_]+)\s*$/, '$1')
      // 说明是obj2.fn = function() {} 或者const fn3 = (a, b) => {}
    } else if (temp.length === 2) {
      result = temp[0].replace(/^.*?\s*([\w_.]+)\s*$/, '$1')
    }
    result = result.replace(/\r/g, '')
    return result
  }
}

// 处理ts中的arg，只拿到arg
const getPureArg = (arg: string, fnName: string) => {
  let result = ''
  if (fnName === 'if') {
    // 先将字符串常量去掉
    arg.replace(/('|`)[^'`]*('|`)/g, '').replace(/([\w_.]+)\s?/g, (str, a): string => {
      result += a + ', '
      return ''
    })
    result = result.replace(/(,\s)+$/, '')
  } else {
    result = arg.split(',').reduce((data, cur, i) => {
      if (i > 0) {
        data += ', '
      }
      data += cur.replace(/^[\s\S]*?([\w_]+)[\s\S]*$/, '$1')
      return data
    }, '')
  }

  return result
}

// 将arg的回车换行进行清除
const getPureInitArg = (arg: string) => {
  // 把字符串进行转换
  return arg
    .replace(/[\n\r]/g, '')
    .replace(/\s+$/g, '')
    .replace(/'/g, "\\'")
}

// 对arg进行JSON处理
const getCopyArg = (arg: string) => {
  return arg.replace(/[\w.]+/g, (str) => {
    return `typeof ${str} === 'object' ? JSON.parse(JSON.stringify(${str})) : ${str}`
  })
}

// 获取添加的console
const getConsoleContent = (fnName: string, initArg: string, arg: string) => {
  const newArg = getCopyArg(arg)
  if (arg) {
    return `console.log('${prefixFn()[0] + fnName}${prefixArg[0] + initArg}', '${
      prefixFn()[1]
    }', '${prefixArg[1]}', ${newArg});`
  } else {
    return `console.log('${prefixFn()[0] + fnName}', '${prefixFn()[1]}');`
  }
}

// 获取添加console的新的函数代码
const getAddConsoleFunCode = (fnCode: string, consoleContent: string) => {
  return fnCode + consoleContent
}

// 获取函数代码对象
const getFunCodeOb = (code: string) => {
  let result = {
    str: '',
    fnName: '',
    initArg: '',
    arg: '',
    shouldConsole: false,
    index: 0
  }
  code.replace(
    /([^\n;]+)\s*\(([^()]*?)(?=\)|=>)\)?\s*(?:=>)?\s*\{(\s*[\s\S]+?)\}/,
    (str: string, fnName: string, arg: string, fnContext: string, index: number): string => {
      result = {
        str,
        fnName,
        initArg: arg,
        arg,
        index,
        shouldConsole: false
      }
      result.str = str.slice(0, str.indexOf(fnContext))
      result.shouldConsole = isShouldConsole(fnContext)
      if (!result.shouldConsole) return ''
      result.fnName = getPureFnName(fnName)
      if (!result.fnName) {
        return (result.shouldConsole = false), ''
      }
      // 关键字剔除
      if (['for', 'switch', ...NATIVE_MAP_METHODS].includes(result.fnName)) {
        return (result.shouldConsole = false), ''
      }
      // 回调函数也剔除，主要是剔除调forEach((item, i) => {})这种
      if (NEW_NATIVE_MAP_METHODS.some((newApiName) => fnName.endsWith(newApiName))) {
        return (result.shouldConsole = false), ''
      }
      result.arg = getPureArg(arg, result.fnName)
      result.initArg = getPureInitArg(arg)
      return ''
    }
  )
  //   console.warn('----- my data is result: ', result)
  return result
}

// 获取添加后的代码
export const getNewCode = (code: string) => {
  if (!code) return ''
  let result = ''
  const funCodeOb = getFunCodeOb(code)
  if (funCodeOb.str && funCodeOb.shouldConsole) {
    const { str, fnName, initArg, arg, index } = funCodeOb
    result += code.slice(0, index)
    const consoleContent = getConsoleContent(fnName, initArg, arg)
    result += getAddConsoleFunCode(str, consoleContent)
    code = code.slice(index + str.length)
    result += getNewCode(code)
    return result
  } else if (funCodeOb.str && !funCodeOb.shouldConsole) {
    result += code.slice(0, funCodeOb.index + funCodeOb.str.length)
    code = code.slice(funCodeOb.index + funCodeOb.str.length)
    result += getNewCode(code)
    return result
  } else {
    return code
  }
}

// 对代码进行切片，拿到每一个函数体的代码
export const getSpliceCode = (code: string, result = ''): string => {
  if (!code) return ''
  const firstIndex = 0
  let spliceCode = ''
  const initCode = code

  code.replace(
    /([^\n;]+)\s*\(([^()]*?)(?=\)|=>)\)?\s*(?:=>)?\s*(\{\s*[\s\S]+?\})/,
    (codeStr, prefix, arg, fnContext, index) => {
      result += code.slice(firstIndex, index)
      spliceCode = codeStr
      code = code.slice(index + codeStr.length)
      const leftNumber = (fnContext.match(/\{/g) || []).length
      const rightNumber = (fnContext.match(/\}/g) || []).length
      let diffNumber = leftNumber - rightNumber
      while (diffNumber > 0) {
        code.replace(/[\s\S]*?\}/, (str, i) => {
          spliceCode += str
          code = code.slice(i + str.length)
          const leftNumber = (str.match(/\{/g) || []).length
          diffNumber = diffNumber - 1 + leftNumber
          return ''
        })
      }
      setConsoleColor()
      result += getNewCode(spliceCode)
      return ''
    }
  )
  if (initCode === code) {
    return result + code
  } else {
    result = getSpliceCode(code, result)
    return result
  }
}
