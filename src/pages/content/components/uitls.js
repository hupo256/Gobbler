import React from 'react'

// 获取xpath
export function cssPath(el) {
  const path = []
  let isPluginDom = false
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase()
    const cls = el.className
    if (cls.includes('chrome-plugin')) {
      isPluginDom = true
      break
    }
    if (el.id) {
      selector += '#' + el.id
      path.unshift(selector)
      break
    } else {
      let sib = el,
        nth = 1
      while ((sib = sib.previousElementSibling)) {
        if (sib.nodeName.toLowerCase() == selector) nth++
      }
      if (selector !== 'html' && selector !== 'body') selector += '[' + nth + ']'
    }
    path.unshift(selector)
    el = el.parentNode
  }
  return { isPluginDom, selectPath: path.join('/') }
}

// 从一个数组里减去另一个数组
export function removeArrItem(arr, targetArr) {
  for (let i = 0, k = arr.length; i < k; i++) {
    const num = targetArr.indexOf(arr[i])
    if (num > -1) {
      targetArr.splice(num, 1)
      continue
    }
  }
  return [].concat(targetArr)
}

// 二维降一维
export function flatten(arr) {
  const ar = [].concat(...arr.map(x => (Array.isArray(x) ? flatten(x) : x)))
  return [...new Set(ar)]
}

// 得到继承过来的doms
export function touchInherDomArrs(dataArr) {
  const excludeDomdArr = []
  const includedDomdArr = []
  dataArr.forEach((item, ind) => {
    // 跳过第一项开始加工
    if (ind && item.appliedFlag) {
      excludeDomdArr.push(item.excludedXpaths)
      includedDomdArr.push(item.includedXpaths)
    }
  })
  // 数组分别折平去重
  const incDoms = flatten(includedDomdArr)
  const excDoms = flatten(excludeDomdArr)
  // 再做减法

  return removeArrItem(incDoms, excDoms)
}

// 给目标加/减class
export function changeDomCls(arr, cls, funKey = 'addClass') {
  arr.length > 0 &&
    arr.forEach(node => {
      // 正则处理一下
      node = node.replace(/\//g, '>')
      node = node.replace(/\[/g, ':nth-of-type(')
      node = node.replace(/\]/g, ')')
      node = node.replace(/html\>/g, '')
      $(node)[funKey](cls)
    })
}

// 提示组件，主要配合css
export function Tooltips(props) {
  const { children, text, cls = '' } = props
  return (
    <span className="chrome-plugin-toolTipsOut">
      {children}
      <u className={`tipTaget ${cls}`}>{text}</u>
    </span>
  )
}
