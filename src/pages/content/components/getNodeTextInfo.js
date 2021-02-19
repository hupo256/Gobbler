// 提取文本
function getNodeTextInfo(node) {
  var list = []
  traverseNodes(node)
  return list

  function traverseNodes(node) {
    //  判断是否是元素节点
    if (node.nodeType === 1) {
      let nodeCss = window.getComputedStyle(node, null) //  判断该元素节点是否有子节点
      if (nodeCss.display !== 'none' && nodeCss.visibility !== 'hidden') {
        if (node.hasChildNodes) {
          // 得到所有的子节点
          var sonnodes = node.childNodes // 遍历所哟的子节点
          for (var i = 0; i < sonnodes.length; i++) {
            var sonnode = sonnodes.item(i) // 得到具体的某个子节点
            traverseNodes(sonnode) // 递归遍历
          }
        }
      }
    } else if (node.nodeType === 3 && node.parentNode.nodeName.toLowerCase() !== 'script') {
      let str = node.nodeValue.replace(/(^\s*)|(\s*$)/g, '') // 去掉首尾的空格以及这其中包含的换行符
      if (str) {
        const pNode = node.parentNode
        const { offsetWidth, offsetHeight } = pNode || {}
        // 捕获文本节点
        const css = window.getComputedStyle(pNode, null)
        const { fontSize, fontWeight, color, backgroundColor } = css
        const fSizeNum = +fontSize.replace(/[a-zA-Z]/g, '')
        if (css.display !== 'none' || css.visibility !== 'hidden') {
          const { x, y } = getPos(pNode)
          const xpath = getFullPathTo(pNode).toLowerCase()
          const hyperlink = gethyperlink(pNode)
          const nodeObj = {
            xpath,
            text: str,
            hAxis: x,
            vAxis: y,
            width: offsetWidth,
            height: offsetHeight,
            fontSize: fSizeNum,
            fontWeight,
            backgroundColor,
            fontColor: color,
            hyperlink,
          }
          list.push(nodeObj)
        }
      }
    }
  }
}

function gethyperlink(el) {
  let link = ''
  if (el.nodeName === 'A') {
    link = el.href
  } else if (el.parentNode && el.parentNode.nodeName === 'A') {
    link = el.parentNode.href
  } else {
    return ''
  }
  const hasHost = link.includes('//')
  return hasHost ? link : location.hostname + link
}

function getPos(el) {
  return {
    x: el.getBoundingClientRect().left + document.documentElement.scrollLeft,
    y: el.getBoundingClientRect().top + document.documentElement.scrollTop,
  }
}

// 获取xpath全路径
function getFullPathTo(element) {
  if (element === document.body) return element.tagName

  var ix = 0
  var siblings = element.parentNode.childNodes
  for (var i = 0; i < siblings.length; i++) {
    var sibling = siblings[i]
    if (sibling === element) return getFullPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']'
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++
  }
}

export default getNodeTextInfo
