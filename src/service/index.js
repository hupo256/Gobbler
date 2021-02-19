import axios from 'axios'
import config from '@src/config'
import MyEvent from './event'
import { uuid, unparams, trimParmas } from '@meizhilab/generaljs'
import { getToken } from '@src/common/tools'
const isDev = process.env.NODE_ENV === 'development'
const baseURL = localStorage.getItem('nearApiDomain') || 'https://api-dev.meizhilab.com'
const { appPrefix } = config
const gaToken = appPrefix + 'apiToken'
const guToken = appPrefix + 'userToken'

// 存储上一次请求url
let prevReqData = {}

// 统一存储限流请求
const limitIP = {}

// 实例化事件监听
const event = new MyEvent()

// 不需要token的接口白名单
const whiteList = ['usam/user/checkExistence', 'usam/session/user', 'usam/verificationCode']

// 统一处理限流规则
const handleLimitIP = async (uid, cb) => {
  if (limitIP[uid]) {
    if (limitIP[uid] <= 10) {
      limitIP[uid]++
      try {
        return await cb()
      } catch (err) {}
    }
  } else {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 1000)
    })

    limitIP[uid] = 1
    try {
      return await cb()
    } catch (err) {}
  }
}

// postRenewTokenFailed
function postRenewTokenFailed() {
  console.log('renew')
  return
  localStorage.setItem(gaToken, '')
  localStorage.setItem(guToken, '')
}

// 添加如果在storage中能获取api地址, 则使用获取到的api地址, 否则使用默认的额api地址
const request = axios.create({ baseURL })

request.defaults.withCredentials = true

// 添加请求拦截器
request.interceptors.request.use(
  async options => {
    const { url, method } = options
    // 调用api之前判断用户token并进行相应处理
    const apiToken = await getToken(gaToken)
    const userToken = await getToken(guToken)
    if (userToken && !apiToken && url.indexOf('usam/token') < 0) {
      return request('usam/token', { method: 'GET' })
    }
    !apiToken && postRenewTokenFailed()
    let headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Ca-Stage': 'TEST',
      'X-Ca-Nonce': uuid(),
      'X-Ca-Timestamp': Date.now(),
    }
    !isDev && (headers = { ...headers, 'X-Account-Id': 'ac-24pn9mbz7k00' })
    chrome.runtime && (headers = { ...headers, 'X-Ca-From': 'Gbackgound' })

    whiteList.indexOf(url) < 0 && (headers = { ...headers, 'X-Api-Token': apiToken })
    whiteList.indexOf(url) > 0 && method === 'delete' && (headers = { ...headers, 'X-Api-Token': apiToken })
    url !== 'usam/token' ? (prevReqData = { url, options }) : (headers['X-User-Token'] = localStorage.getItem(guToken))
    return { ...options, headers }
  },
  function(error) {
    // 对请求错误做些什么
    return Promise.reject(error)
  },
)

// 添加响应拦截器
request.interceptors.response.use(
  function(response) {
    // 对响应数据做点什么
    // 使用header里的uuid来实现存储interfaceId信息
    return new Promise((resolve, reject) => {
      let { statusCode, systemMessage, responseMessage } = response.data

      //statusCode = 200
      if (statusCode === 200) {
        // 如果是renewToken调用成功, 则更新token, 页面续订完成
        if (response.config.url.indexOf('usam/token') > -1) {
          localStorage.setItem(gaToken, responseMessage.apiToken)
          localStorage.setItem(guToken, responseMessage.userToken)
          localStorage.setItem(appPrefix + 'sessionExpiry', responseMessage.sessionExpiry)

          //如果是登录页面,则返回至USAM逻辑
          if (window.location.href.indexOf('/usam/signin') > -1) {
            resolve(responseMessage)
            return
          }

          history.go(0)
        }

        //systemMessage = null
        if (!systemMessage) {
          resolve(responseMessage)
          // 如果是get请求,则将数据存入indexedDB
          if (response.config.method.toUpperCase() === 'GET') {
            let _path = response.config.url.indexOf('http') > -1 ? response.config.url : `${location.protocol}//${location.host}/${response.config.url}`
            let url = new URL(`${_path.indexOf('?') > 0 ? _path : _path + '?' + unparams(response.config.params)}`)
            if (window.db) {
              let pathurl = url.pathname + trimParmas(url.search)
              // 触发缓存事件, 以防因为并发问题导致的indexedDB失效
              event.emit(pathurl, responseMessage)
              event.cache[pathurl] = 0
              // 不存在缓存白名单的请求不保存在db中
              const isCache = cacheWhiteList.some(v => response.config.url.indexOf(v) > -1)
              if (isCache) {
                db.add(tableName, { path: pathurl, cache: responseMessage }, 24 * 60 * 60 * 1000)
              }
            }
          }
          return
        }
      }

      //statusCode = 401
      // 如果返回了systemMessage就认为请求失败
      if (statusCode === 401 || systemMessage) {
        reject(responseMessage)
        postRenewTokenFailed()
      }
    })
  },
  async function(error) {
    // 对响应错误做点什么
    const { response } = error
    if (!response) {
      postRenewTokenFailed()
      return
    }

    //from renewToken()
    if (response.config.url.indexOf('usam/token') > -1) {
      postRenewTokenFailed()
      return
    }

    let uid = response.config.headers['X-ca-nonce']
    //HTTP 状态码 = 429
    if (response.status === 429) {
      if (response.headers['x-ca-error-message'] === 'FC-IP') {
        // 当前 IP 过于频繁地操作, 前端等待 1 秒钟后重新提交该请求, 重复提交 10 次失败后弹窗: 休息一下
        try {
          let data = await handleLimitIP(uid, () => request(response.config))
          return Promise.reject({ response: data })
        } catch (err) {}
        return
      }

      // 其它情况下触发流控, 前端等待 1 秒钟后重新提交该请求, 重复提交 10 次失败后弹窗: 休息一下
      try {
        let data = await handleLimitIP(uid, () => request(response.config))
        return Promise.reject({ response: data })
      } catch (err) {}
      return
    }

    //HTTP 状态码 = 403
    if (response.status === 403) {
      if (response.headers['x-ca-error-code'].indexOf('A403J') > -1) {
        // Token 已过期, 应 RenewToken 或者重新登录
        try {
          let res = await request('usam/token', { method: 'GET' })
          if (res && Object.keys(res).length > 0) {
            let data = await request(prevReqData.url, prevReqData.options)
            return Promise.reject({ response: data })
          }
        } catch (err) {
          // console.log(err)
        }
        return
      }

      if (response.headers['x-ca-error-code'].indexOf('Throttled') > -1 || response.headers['x-ca-error-message'].indexOf('Throttled') > -1) {
        // 其它情况下触发流控, 前端等待 1 秒钟后重新提交该请求, 重复提交 10 次失败后弹窗: 休息一下
        try {
          let data = await handleLimitIP(uid, () => request(response.config))
          return Promise.reject({ response: data })
        } catch (err) {}
        return
      }
    }
  },
)

// 缓存白名单, 后续需要缓存的都在这里维护
const cacheWhiteList = ['usam/user', 'generalservice/generalParameter', 'metabase/entity/detailViewUri']

// 监听并获取缓存的数据
const getCache = event_id => {
  return new Promise(resolve => {
    event.on(event_id, data => {
      resolve(data)
      event.clearCache(10000)
    })
  })
}

// 请求代理
const proxyRequest = async (url, options) => {
  if (options.method === 'GET' && window.db) {
    const isCache = cacheWhiteList.some(v => url.indexOf(v) > -1)
    if (isCache) {
      let paramStr = unparams(options.params)
      let urlPath = url.indexOf('?') > -1 ? url : `${url}${paramStr ? `?${unparams(options.params)}` : ''}`
      try {
        let data = await window.db.get(tableName, `/${urlPath}`)
        if (data.data) {
          return data.data.cache
        } else {
          if (event.cache[urlPath]) {
            return await getCache(`/${urlPath}`)
          } else {
            event.cache[urlPath] = 1
            return await request({ url, method: 'GET', ...options })
          }
        }
      } catch (err) {
        return await request({ url, method: 'GET', ...options })
      }
    } else {
      return await request({ url, method: 'GET', ...options })
    }
  } else {
    return await request({ url, method: 'GET', ...options })
  }
}

const apiProxy = (url, options) => {
  return new Promise(resolve => {
    proxyRequest(url, options)
      .then(res => {
        resolve(res)
      })
      .catch(err => {
        if (err.response) {
          resolve(err.response)
        }
      })
  })
}

export default apiProxy
