const appPrefix = 'Gobbler-'
const gaToken = appPrefix + 'apiToken'
const guToken = appPrefix + 'userToken'
const invTime = 5000
let timer // 定时器，用来 setTimeout
const GobblerBGData = {
  optType: 'captureRepo', //  captureRepo  /  captureRule
  apiUrl: '', // https://api-dev.meizhilab.com/rpasource/gobbler
  baseUrl: '', // 'https://dev.meizhilab.com/rpasource/gobbler/option/',
  urlObj: null,
  prevTab: NaN,
  captureRepoId: '',
  taskQueue: [],
  db: null,
}

// 连接DB，开始走循环
openDB().then(db => {
  CRC32Loop() // crc32校验
  toUploadLoop() // 上传
})
toCollect() // 任务队列

/**
 * 封装fetch
 * @param {*} url
 * @param {*} opt
 */
const creatFech = async (url, opt) => {
  const { method = 'get', body, query } = opt || {}
  const { apiUrl } = GobblerBGData
  const Token = await getToken()
  let Url = url
  const setConfig = { method }
  if (query)
    Url += `?${Object.keys(query)
      .map(key => key + '=' + query[key])
      .join('&')}`
  if (body) setConfig.body = JSON.stringify(body)
  const data = await fetch(`${apiUrl}${Url}`, {
    ...setConfig,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Ca-Stage': 'TEST',
      'X-Ca-From': 'Gbackgound',
      'X-Ca-Nonce': createUuid(),
      'X-Ca-Timestamp': Date.now(),
      'X-Api-Token': Token,
    },
  })
    .then(res => res.json())
    .then(res => {
      const dt = res.responseMessage
      sendMessageToContentScript(dt) // 拿到结果就往content_script发个信号
      return dt
    })
    .catch(err => {
      cleanToken(err)
    })

  return data
}

function cleanToken(err) {
  chrome.storage.sync.set({ [gaToken]: '' }, res => {
    changeEntryIcon(1)
    console.log('请重新登录Gobbler')
  })
}

/**
 * contnet_script中的 api 请求们
 */
// 获取当前页面的排除节点, 仅在当前页面需要抓取时调用
const getExcludedNodes = async params => {
  return await creatFech('/exclusion', {
    method: 'GET',
    query: params,
  })
}

// 设置页面的排除规则, 用于排除特定的页面节点以不被抓取
const setExclusionRule = async (params, data) => {
  return await creatFech('/exclusion/rule', {
    method: 'PUT',
    body: data,
    query: params,
  })
}

// 删除一条排除规则
const deleteExclusionRule = async params => {
  return await creatFech('/exclusion/rule', {
    method: 'DELETE',
    query: params,
  })
}

// 批量获取页面的排除规则
const getExclusionRules = async params => {
  return creatFech(`/exclusion/rule`, {
    method: 'GET',
    query: params,
  })
}

// 获取DataHub的授权信息, 用于直传网页抓取文本
const getUploadTextAuth = async () => {
  return await creatFech('/uploadAuth/text')
}

// 增删改网页抓取规则
const alterCaptureRules = async params => {
  return creatFech('/option/captureRule', {
    method: 'PUT',
    body: params,
  })
}

// 根据规则判断此页面要不要抓取
function shouldToWork(curUrl, infor = {}) {
  const { captureRules } = infor
  // 没有规则、没有命中都不工作
  if (!captureRules || !captureRules.length) return sendMessageToContentScript({ isWork: false })
  const { captureRepoId = '' } = touchCurRule(curUrl, captureRules)
  if (!captureRepoId) return sendMessageToContentScript({ isWork: false }) // 没有命中
  GobblerBGData.captureRepoId = captureRepoId
  sendMessageToContentScript({ isWork: true })
}

/**
 * contnet_script api end
 */
// 监听来自content-script的消息
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const { tokenTag, putInDBTag, urlObjTag, GobblerUserTag, isWorkTag, pageUidTag, getExcludedNodesTag, setExclusionRuleTag, deleteExclusionRuleTag, alterCaptureRulesTags } = request || {}
  // 如果传token过来，则存到storage里
  if (tokenTag) {
    const { GAToken, GUToken } = tokenTag
    if (GAToken !== 'injection') {
      changeEntryIcon(2)
      chrome.storage.sync.set({ [gaToken]: GAToken, [guToken]: GUToken }, res => {})
    }
    sendMessageToContentScript('loadContent') // 告诉页面加载程序
  }

  // Slider过来的url
  if (urlObjTag) GobblerBGData.urlObj = urlObjTag

  // 保存option过来的用户信息
  if (GobblerUserTag) {
    const { thenUrl, apiUrl, baseUrl } = GobblerUserTag
    GobblerBGData.apiUrl = apiUrl // 'https://api-dev.meizhilab.com/rpasource/gobbler',
    GobblerBGData.baseUrl = baseUrl // 'https://dev.meizhilab.com/rpasource/gobbler/option/',
    shouldToWork(thenUrl, GobblerUserTag) // 更新用户信息后，告诉页面，用新的规则工作
    addToDB(GobblerUserTag) // 存入db
  }

  // 页面问要不要开始工作
  if (isWorkTag) {
    changeEntryIcon(2) // 刷新页面，则初始化一下
    const userInfo = await getInDB(appPrefix + 'user')
    shouldToWork(isWorkTag, userInfo)
  }

  // 写任务队列
  if (pageUidTag) {
    const { taskQueue } = GobblerBGData
    const taskObj = taskQueue.filter(t => t.pageUid === pageUidTag)[0]
    if (taskObj) return // 如果找到,说明已经有了，不用再添加
    const curTab = await getCurrentTabId() // 传了tabId说明是tab切换过来的任务，否则就是滚动事件过的任务
    creatNewTask(pageUidTag, curTab)
  }

  // 往DB里插入数据
  if (putInDBTag) {
    const { accountId } = await getInDB(appPrefix + 'user')
    const { webUri, webCaptureNodes } = putInDBTag
    const { captureRepoId } = GobblerBGData
    if (!accountId) {
      console.log('没有设置规则')
      return
    }
    getExcludedNodes({ webUri }).then(res => {
      if (!res) return
      const { appliedExcludedXpaths } = res
      const wcNodes = delDomsInPage(appliedExcludedXpaths, webCaptureNodes)
      addToDB({
        parameters: { accountId },
        customMessage: {
          ...putInDBTag,
          captureRepoId,
          webCaptureNodes: wcNodes,
        },
        id: `TOVERIFY:${createUuid()}`,
      }).then(res => {
        console.log('========>> 数据已保存')
        changeEntryIcon(3)
      })
    })
    // addToDB({
    //   parameters: { accountId },
    //   customMessage: {
    //     ...putInDBTag,
    //     captureRepoId,
    //     webCaptureNodes,
    //   },
    //   id: `TOVERIFY:${createUuid()}`,
    // }).then(res => {
    //   console.log('========>> 数据已保存')
    //   changeEntryIcon(3)
    // })
  }

  // 代理请求后台相关数据
  if (getExcludedNodesTag) {
    getExcludedNodes(getExcludedNodesTag).then(re => {
      if (!re) return
      const appliedFlags = {}
      const exclusionRuleIds = re.exclusionRules.map(rule => {
        const { exclusionRuleId, appliedFlag } = rule
        appliedFlags[exclusionRuleId] = appliedFlag
        return exclusionRuleId
      })
      if (!exclusionRuleIds.length) {
        console.log('排除规则为空')
        return
      }
      const param = { exclusionRuleIds: exclusionRuleIds.join(), ...getExcludedNodesTag }
      getExclusionRules(param).then(res => {
        if (!res) return
        const { exclusionRules } = res
        const exlRules = exclusionRules.map((rule, ind) => {
          const { exclusionRuleId, noInheritanceFlag } = rule
          ind || (rule.noInheritanceFlag = !noInheritanceFlag)
          const appliedFlag = appliedFlags[exclusionRuleId]
          return { ...rule, appliedFlag } // 将需要的信息合并进来
        })
        sendMessageToContentScript({ exclusionRules: exlRules })
      })
    })
  }

  // 设置数据
  if (setExclusionRuleTag) {
    const { params, data } = setExclusionRuleTag
    setExclusionRule(params, data)
  }

  // 删除排除规则
  if (deleteExclusionRuleTag) deleteExclusionRule(deleteExclusionRuleTag)

  // 设置抓取规则
  if (alterCaptureRulesTags) alterCaptureRules({ captureRules: [alterCaptureRulesTags] })
})

// 生成一个新任务
function creatNewTask(pid, tid) {
  debounce(() => {
    const task = {
      captureTime: Date.now(),
      pageUid: pid,
      tabId: tid,
    }
    GobblerBGData.taskQueue.unshift(task) // 往队列里添加新的任务
    console.log('=====>>  已生成新任务')
  }, invTime / 2)()
}

// 防抖
function debounce(fn, delay) {
  return () => {
    const context = this
    const args = arguments
    clearTimeout(timer) // 每次这个返回的函数被调用，就清除定时器，以保证不执行 fn
    timer = setTimeout(() => {
      fn.apply(context, args)
    }, delay) // 再过 delay 毫秒就执行 fn
  }
}

/**
 * 页面tab间的监听
 */
chrome.tabs.onActivated.addListener(activeInfo => {
  const { tabId } = activeInfo
  const { prevTab } = GobblerBGData
  const tId = prevTab || tabId
  chrome.tabs.sendMessage(tId, { prevTab }, res => {
    console.log(res)
    const { pageUid } = res || {}
    pageUid && creatNewTask(pageUid, tId)
    GobblerBGData.prevTab = tabId // 刷新一下
  })
})

/**
 * 按顺序执行获取任务
 */
function toCollect() {
  const { taskQueue } = GobblerBGData
  if (taskQueue.length > 0) {
    const { captureTime, tabId } = taskQueue.shift()
    tabId && chrome.tabs.sendMessage(tabId, { captureTime }, res => {})
    toCollect()
  } else {
    setTimeout(() => {
      toCollect()
    }, invTime / 5)
  }
}

/**
 * 待上传Loop
 */
async function toUploadLoop() {
  const keys = await getAllKeys()
  const touploadKeys = keys.filter(key => key.includes('TOUPLOAD:'))
  touploadKeys.length > 0 // 找到就开始操作，不然后等会儿再找一次
    ? doUploadCell(touploadKeys)
    : setTimeout(() => {
        toUploadLoop()
      }, invTime)
}

async function doUploadCell(keys) {
  const curKey = keys.shift()
  if (!curKey) {
    toUploadLoop() //队列操作完了，尝试进入下个loop
    return
  }
  const uploadData = await getInDB(curKey) // 取出一个

  // 开始上传
  submitNodeList(uploadData, res => {
    delInDB(curKey).then(res => {
      doUploadCell(keys) // 删除然后进行下一个
    })
  })
}

// 提交nodeList逻辑
function submitNodeList(pData, callback) {
  // 每次提交时先尝试从storage里拿请求参数
  chrome.storage.sync.get({ shardsConfig: '' }, res => {
    const { shardsConfig } = res
    if (shardsConfig) {
      subNodes(shardsConfig, pData, callback)
    } else {
      // 如果storage里没有,就先请求一个
      getUploadTextAuth().then(res => {
        console.log(res)
        subNodes(res, pData, callback) // 拿到后开始提交
        chrome.storage.sync.set({ shardsConfig: res }, d => {})
      })
    }
  })
}

// 提交前params的封装
function subNodes(config, pData, callback) {
  console.log('提交的数据：', pData)
  const { msgUploadPostUrl, msgUploadHeaders, msgUploadParams = {} } = config
  const { Action, Attributes, ShardId } = msgUploadParams
  const params = {
    Action,
    // Records: [{ ShardId, Attributes, Data: pData }],
    Records: [{ ShardId, Attributes, Data: encode(JSON.stringify(pData)) }],
  }

  // msgUploadHeaders.Date = 'Tue, 09 Feb 2022 09:51:55 GMT'

  fetch(msgUploadPostUrl, {
    method: 'post',
    headers: { ...msgUploadHeaders, 'x-Date': msgUploadHeaders.Date },
    body: JSON.stringify(params),
  })
    .then(res => {
      return res.json()
    })
    .then(res => {
      const { FailedRecordCount } = res
      if (FailedRecordCount !== 0) {
        chrome.storage.sync.set({ shardsConfig: '' }) // 失败后清空
        toUploadLoop()
      } else {
        console.log('=====>> 数据提交成功')
        callback && callback(res)
      }
    })
    .catch(err => {
      chrome.storage.sync.set({ shardsConfig: '' }, res => {
        console.log(res)
      })
    })
}

/**
 * CRC32校验Loop
 */
async function CRC32Loop() {
  const keys = await getAllKeys()
  const toVerifyKeys = keys.filter(key => key.includes('TOVERIFY:'))
  toVerifyKeys.length > 0 // 找到就开始操作，不然后等会儿再找一次
    ? doCRCCell(toVerifyKeys)
    : setTimeout(() => {
        CRC32Loop()
      }, invTime)
}

async function doCRCCell(keys) {
  const curKey = keys.shift()
  if (!curKey) {
    CRC32Loop() //队列操作完了，尝试进入下个loop
    return
  }
  const verifyData = await getInDB(curKey) // 取出一个
  let { CRCList = [] } = (await getInDB('CRC32S')) || {}
  const {
    customMessage: { webCaptureNodes = [], captureRepoId = '' },
  } = verifyData
  const textList = webCaptureNodes.map(item => item.text)
  const crcNmb = GetCrc32(JSON.stringify(textList) + JSON.stringify(captureRepoId))
  const ind = CRCList.indexOf(crcNmb)
  await updateArr(CRCList, crcNmb, ind) // 更新CRC32s, 是个异步操作

  // 要不要转存?
  ind === -1 && (await addToDB({ ...verifyData, id: `TOUPLOAD:${createUuid()}` }))
  delInDB(curKey).then(res => {
    doCRCCell(keys) // 删除然后进行下一个
  })
}

// 更新CRC32s
function updateArr(arr, item, num) {
  num > -1 && arr.splice(num, 1)
  arr.push(item)
  arr.length > 20 && arr.shift()
  addToDB({
    id: `CRC32S`,
    CRCList: arr, // 顺便更新db里的list
  })
}

/**
 * DB操作
 */
function delInDB(key) {
  return creatStoreEvent({ type: 'delete', param: key })
}

function getInDB(key) {
  return creatStoreEvent({ type: 'get', param: key })
}

function addToDB(param) {
  return creatStoreEvent({ type: 'put', param })
}

function getAllKeys() {
  return creatStoreEvent({ type: 'getAllKeys' })
}

function creatStoreEvent(config) {
  const { type = '', param = null } = config || {}
  return new Promise((resolve, reject) => {
    GobblerBGData.db
      .transaction(['page'], 'readwrite')
      .objectStore('page')
      [type](param).onsuccess = e => {
      const { result } = e.target
      e.type === 'success' ? resolve(result) : reject('fail')
    }
  })
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gdb', 2)
    request.onsuccess = e => {
      GobblerBGData.db = e.target.result
      resolve(e.target.result)
    }
    request.onerror = e => reject(e)
    request.onupgradeneeded = e => {
      GobblerBGData.db = e.target.result
      if (!GobblerBGData.db.objectStoreNames.contains('page')) {
        GobblerBGData.db.createObjectStore('page', {
          keyPath: 'id',
          autoIncrement: true,
        })
      }
    }
  })
}

/**
 *  tools 工具function
 *
 * */

// 向content-script主动发送消息
async function sendMessageToContentScript(message, callback) {
  const tabId = await getCurrentTabId()
  chrome.tabs.sendMessage(tabId, message, res => {
    if (callback) callback(res)
  })
}

// 获取当前选项卡ID
function getCurrentTabId() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      resolve(tabs.length ? tabs[0].id : null)
    })
  })
}

// 生成uuid
function createUuid() {
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

// 主动弹出层
function showCommonPopup() {
  chrome.browserAction.setIcon({
    path: {
      '19': 'assets/img/zdg.png',
    },
  })
}

// 修改入口图标
// 1 未登录， 2 未获取， 3 已获取
function changeEntryIcon(num) {
  let img = ''
  switch (num) {
    case 1:
      img = 'collectclose32px.png'
      break
    case 2:
      img = 'collectopen32px.png'
      break
    case 3:
      img = 'collectfinish32px.png'
      break
  }

  chrome.browserAction.setIcon({
    path: { '32': 'assets/img/' + img },
  })
}

// 新标签打开某个链接
function openUrlNewTab(url) {
  chrome.tabs.create({ url: url })
}

function getToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(gaToken, res => {
      resolve(res[gaToken])
    })
  })
}

function touchGobblerBGData() {
  return GobblerBGData
}

// 剔除页面上不需要抓取的节点
function delDomsInPage(excDoms, nodeList) {
  for (let i = 0, k = excDoms.length; i < k; i++) {
    const path = excDoms[i].replace('html/', '')
    for (let m = 0, n = nodeList.length; m < n; m++) {
      const { xpath } = nodeList[m]
      if (xpath === path) {
        nodeList.splice(m, 1)
        break
      }
    }
  }
  return nodeList
}

// crc32
const table =
  '00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D'
/* Number */
function GetCrc32(/* String */ str, /* Number */ crc = 0) {
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

/**
 * base64
 */
const _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
function encode(input) {
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
function touchUriObj(uri) {
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
  const rList = tlen > rlen ? tArr : rArr // 取出较长的数组为从数组，用为比对
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
function touchCurRule(curUrl, ruleArr) {
  const ranks = []
  const { host, path } = touchUriObj(curUrl)
  if (!(ruleArr && ruleArr.length)) {
    console.log('没有匹配到规则')
    return
  }
  ruleArr.map((item, ind) => {
    const rUriObj = touchUriObj(item.webUriPattern)
    const hostKey = rUriObj.host.replace(/\*/g, '') //去掉*得到匹配的关键字
    if (host.includes(hostKey)) {
      const pathRank = compareArr(path, rUriObj.path)
      ranks.push({ pathRank, index: ind })
    }
  })
  if (ranks.length > 0) {
    const { index } = ranks.sort(compareWith('pathRank'))[0] // 排序后最前面的即是最匹配的
    return ruleArr[index] || {}
  } else {
    return {}
  }
}

/**
 * 图标颜色
 */
chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          // 只有打开百度才显示pageAction
          new chrome.declarativeContent.PageStateMatcher({ pageUrl: { urlContains: 'baidu.com' } }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ])
  })
})

/**
 * 拦截请求
 */
chrome.webRequest.onBeforeSendHeaders.addListener(
  details => {
    const { requestHeaders } = details
    const dataTag = requestHeaders.filter(req => req.name === 'x-Date')[0]
    const Gbackgound = requestHeaders.filter(req => req.name === 'X-Ca-From')[0]
    const originTag = { name: 'Origin', value: 'https://datapollo.com' }
    const refererTag = { name: 'Referer', value: 'https://datapollo.com' }
    Gbackgound && (details.requestHeaders = [...requestHeaders, originTag, refererTag])
    dataTag && (details.requestHeaders = [...requestHeaders, { name: 'Date', value: dataTag.value }])
    return { requestHeaders: details.requestHeaders }
  },
  { urls: ['<all_urls>'] },
  ['blocking', 'requestHeaders', 'extraHeaders'],
)
