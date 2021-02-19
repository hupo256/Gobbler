// crc32
const table =
  '00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D'
/* Number */
export function GetCrc32(/* String */ str, /* Number */ crc = 0) {
  if (crc === window.undefined) crc = 0
  var n = 0 //a number between 0 and 255
  var x = 0 //an hex number
  crc = crc ^ -1
  for (var i = 0, iTop = str.length; i < iTop; i++) {
    n = (crc ^ str.charCodeAt(i)) & 0xff
    x = '0x' + table.substr(n * 9, 8)
    crc = (crc >>> 8) ^ x
  }
  return crc
}

// 获取当前选项卡ID
function getCurrentTabId(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (callback) callback(tabs.length ? tabs[0].id : null)
  })
}

// 向content-script主动发送消息
export function sendMessageToContentScript(message, callback) {
  getCurrentTabId(tabId => {
    chrome.tabs.sendMessage(tabId, message, res => {
      if (callback) callback(res)
    })
  })
}

export function createUuid() {
  let s = []
  let hexDigits = '0123456789abcdef'
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
  }
  s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = '-'
  let uuid = s.join('')
  return uuid
}

export function getToken(key) {
  // 读取数据，第一个参数是指定要读取的key以及设置默认值
  if (chrome.extension) {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(key, res => {
        resolve(res[key])
      })
    })
  } else {
    return localStorage.getItem(key)
  }
}

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
    // console.log(el.parentNode)
  }
  return { isPluginDom, selectPath: path.join('/') }
}

/**
 * base64
 */
const _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
export function encode(input) {
  var output = ''
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4
  var i = 0
  input = _utf8_encode(input)
  while (i < input.length) {
    chr1 = input.charCodeAt(i++)
    chr2 = input.charCodeAt(i++)
    chr3 = input.charCodeAt(i++)
    enc1 = chr1 >> 2
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
    enc4 = chr3 & 63
    if (isNaN(chr2)) {
      enc3 = enc4 = 64
    } else if (isNaN(chr3)) {
      enc4 = 64
    }
    output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4)
  }
  return output
}
function _utf8_encode(string) {
  string = string.replace(/\r\n/g, '\n')
  var utftext = ''
  for (var n = 0; n < string.length; n++) {
    var c = string.charCodeAt(n)
    if (c < 128) {
      utftext += String.fromCharCode(c)
    } else if (c > 127 && c < 2048) {
      utftext += String.fromCharCode((c >> 6) | 192)
      utftext += String.fromCharCode((c & 63) | 128)
    } else {
      utftext += String.fromCharCode((c >> 12) | 224)
      utftext += String.fromCharCode(((c >> 6) & 63) | 128)
      utftext += String.fromCharCode((c & 63) | 128)
    }
  }
  return utftext
}

// 数组排序函数
function compareWith(property) {
  return (a, b) => {
    var value1 = a[property]
    var value2 = b[property]
    return value1 - value2
  }
}

// 将uri分别转为数组
export function touchUriObj(uri) {
  const num = uri.indexOf('/')
  const host = uri.slice(0, num)
  const path = uri.slice(num + 1).split('/')
  return { host, path }
}

// 比对两个数组项的相同度
function compareArr(tArr = [], rArr = []) {
  const tlen = tArr.length
  const rlen = rArr.length
  const tList = tlen <= rlen ? tArr : rArr // 取出较短的数组为主数组，作为参照
  const rList = tlen > rlen ? tArr : rArr // 取出较长的数组为从数组，作为比对
  const len = tList.length // 用较短的这个数组的长度作为找不到的默认值
  let rank = 0
  tList.forEach((item, ind) => {
    if (rList[ind] === '*' || rList[ind] === item) return (rank += ind)
    return (rank += len)
  })
  return rank
}

/**
 * 算出当前uri与规则list的匹配度
 * host 以 . 切分，倒排比对, path 去掉第一个 / 顺序比对
 * 如果几个总和相同，则看 path 部分最小的的那个
 * 比对的时候，相同或为*则返回index, 不同则返回length
 * 拿到比对相同项的index, 分别相加，总和最小的为要找的那个
 *
 * @param {当前的uri} curUrl
 * @param {规则list} ruleArr
 */
export function touchCurRule(curUrl, ruleArr) {
  const ranks = []
  const { host, path } = touchUriObj(curUrl)
  ruleArr.map((item, ind) => {
    const rUriObj = touchUriObj(item.webUriPattern)
    const hostKey = rUriObj.host.replace(/\*/g, '') //去掉*得到匹配的关键字
    if (host.includes(hostKey)) {
      const pathRank = compareArr(path, rUriObj.path)
      ranks.push({ pathRank, index: ind })
    }
  })
  // console.log(ranks.sort(compareWith('pathRank')))
  if (ranks.length > 0) {
    const { index } = ranks.sort(compareWith('pathRank'))[0] // 排序后最前面的即是最匹配的
    return ruleArr[index] || {}
  } else {
    return {}
  }
}
