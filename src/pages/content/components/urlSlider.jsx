import React, { useState, useEffect, useContext } from 'react'
import { alterCaptureRules } from '@src/api'
import { ctx } from '../context'

const rangeArr = ['域名', '路径']
let urlData = null

export default function UrlSlider() {
  const { showSlider, setshowSlider, fromPop, setfromPop, setExRules, seteditRule, exclusionRules, captureRuleId, captureRepoId } = useContext(ctx)
  const [urlObj, seturlObj] = useState(touchUrl()) //url对象
  const [urlText, seturlText] = useState('') //url对象
  const [uriErr, seturiErr] = useState(false)

  useEffect(() => {
    touchUrlStr()
  }, [urlObj])

  function touchUrl(url) {
    const { hostname, pathname } = location
    const hostLen = 0
    const pathLen = 0
    return { hostname, pathname, hostLen, pathLen }
  }

  // 渲染出显示的url
  // 考虑到需要反复滑动，所以源url先copy一份
  function touchUrlStr() {
    const { hostname, pathname, hostLen, pathLen } = urlObj
    let hostnameStr = '',
      pathnameStr = ''
    //计算域名
    const hostArr = hostname.split('.')
    const hostStr = hostArr.slice(hostLen).join('.')
    hostnameStr = hostLen ? `*.${hostStr}` : hostname

    // 计算路径
    const pathArr = pathname.slice(1).split('/')
    const curNum = pathArr.length - pathLen
    const arrStr = pathArr.slice(0, curNum).join('/')
    pathnameStr = pathLen ? `/${arrStr}/*` : pathname
    curNum === 0 && (pathnameStr = '/*') // 滑到最大时范围也最大

    urlData = { hostname: hostnameStr, pathname: pathnameStr } // 顺便保存最近的url
    seturlText(hostnameStr + pathnameStr)
    seturiErr(false)
  }

  // 计算出滑块的最大值
  function getLenForRange(num) {
    const { hostname, pathname } = urlObj
    const hostKey = hostname.includes('.com.cn') ? '.com.cn' : '.com'
    const hostStr = hostname.split(hostKey)[0]
    const key = num === 0 ? '.' : '/'
    const str = num === 0 ? hostStr : pathname
    const len = str.split(key).length
    return len - 1
  }

  // 响应ragne的变化，更新显示的值
  function rangeChange(dom, num) {
    const val = dom.target.value
    const pName = num === 0 ? 'hostLen' : 'pathLen'
    seturlObj({ ...urlObj, [pName]: +val })
  }

  // 刷新所要标注的域名
  function updateUrlObj() {
    const len = exclusionRules.filter(rule => rule.exclusionUriPattern === urlText).length
    if (len) {
      seturiErr(true)
      return
    }
    const { hostname, pathname } = urlData
    const newRule = {
      exclusionUriPattern: `${hostname}${pathname}`,
      exclusionRuleId: '',
      publicExclusionFlag: false,
      noInheritanceFlag: false,
      appliedFlag: false,
      excludedXpaths: [],
      includedXpaths: [],
    }
    const excArr = exclusionRules.map(item => {
      item.appliedFlag = false
      return item
    })

    setshowSlider(!showSlider)
    chrome.runtime && chrome.runtime.sendMessage({ urlObjTag: urlData })

    if (fromPop) {
      setfromPop(false)
      const params = {
        captureRuleId,
        captureRepoId,
        deleteFlag: false,
        webUriPattern: `${hostname}${pathname}`,
      }

      chrome.runtime.sendMessage({ alterCaptureRulesTags: params })
    } else {
      setExRules([newRule, ...excArr])
      seteditRule(true)
    }
  }

  return (
    <div className="chrome-plugin-popupbox">
      <div className="chrome-plugin-urlbox">
        <h3>Gobbler采集页面范围</h3>
        <p>Gobbler会采集以下规则配置中的数据：</p>
        <p className={`errorMsg ${uriErr ? 'fadein' : ''}`}>地址重复，无法保存</p>
        <p className="urlText">{urlText}</p>
        <ul className="sliderbox">
          {rangeArr.map((range, index) => {
            const mx = getLenForRange(index)
            return (
              <li key={index}>
                <b>{range}</b>
                <input type="range" defaultValue={0} max={mx} onChange={e => rangeChange(e, index)} />
              </li>
            )
          })}
        </ul>
        <p className="f12">您可以滑动以更改Gobbler采集的页面范围</p>
        <div className="btnbox">
          <button onClick={() => setshowSlider(!showSlider)}>取消</button>
          <button onClick={updateUrlObj}>确定</button>
        </div>
      </div>
    </div>
  )
}
