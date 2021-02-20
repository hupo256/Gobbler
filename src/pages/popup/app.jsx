import React, { useState, useEffect, useContext } from 'react'
import { Provider, ctx } from './context'
import config from '@src/config'
import { getOptions, getUserProfile } from '@src/api'
import RuleEditor from './components/ruleEditor'
import headimg from '@assets/img/zdg.png'
import gLogo from '@assets/img/gLogo.png'
import tologin from '@assets/img/tologin.png'
import toedit from '@assets/img/toedit.png'
import dLogo from '@assets/img/dLogo.png'
import './popup.less'

const { appPrefix } = config
const gaToken = appPrefix + 'apiToken'

function Home() {
  const { captureRepos, setcaptureRepos, setaccountId, setcaptureRules } = useContext(ctx)
  const [isLogin, setisLogin] = useState(true)
  const [headImg, setheadImg] = useState('')
  const [loading, setloading] = useState(false)

  useEffect(() => {
    touchBaseInfo()
  }, [])

  function touchBaseInfo() {
    getOptions().then(res => {
      const { captureRepos, captureRules } = res
      setcaptureRepos(captureRepos)
      setcaptureRules(captureRules)
      setloading(false)
    })
    getUserProfile().then(res => {
      if (!res) return setisLogin(false) // 返回出错则认为token过期，尝试走get token的逻辑
      if (res) setisLogin(true)
      const { accountId, userAvatarUrl } = res
      setaccountId(accountId)
      setheadImg(userAvatarUrl)
    })
  }

  function toLogout() {
    if (!chrome.storage) {
      localStorage.setItem([gaToken], '')
      setisLogin(false)
      return
    }
    chrome.storage.sync.set({ [gaToken]: '' }, res => {
      console.log('请重新登录Gobbler')
      setisLogin(false)
    })
  }

  function gotoDatapollo() {
    const nextUrl = 'https://dev.meizhilab.com/usam/signin?m=MCC02'
    if (chrome && chrome.runtime) {
      chrome.tabs.create({ url: nextUrl })
    } else {
      location.href = nextUrl
    }
  }

  function goDatapollo() {
    const nextUrl = 'https://datapollo.com/'
    if (!chrome.extension) {
      location.href = nextUrl
      return
    }
    chrome.tabs.create({ url: nextUrl })
  }

  function gotoEditPage() {
    if (chrome && chrome.runtime) {
      chrome.runtime.openOptionsPage()
    } else {
      location.href = 'https://dev.meizhilab.com/rpasource/gobbler/option/captureRepo'
    }
  }

  function bgApitest() {
    const bg = chrome.extension.getBackgroundPage()
    // bg.toCollect()
    const bgdata = bg.touchGobblerBGData()
    console.log(bgdata.taskQueue)

    // setTimeout(() => {
    //   bg.toCollect()
    // })

    touchBaseInfo()
  }

  return (
    <>
      {loading ? (
        ''
      ) : (
        <div className="popupPage">
          {!isLogin && (
            <div className="defaultView">
              <img src={tologin} alt="" onClick={bgApitest} />
              <p>尚未登录系统</p>
              <a onClick={() => gotoDatapollo()}>立即登录</a>
            </div>
          )}

          {isLogin && (
            <h3>
              <span>
                <img src={gLogo} alt="" onClick={bgApitest} />
              </span>
              <span className="bottomRight">
                <img src={headImg || headimg} alt="" />

                <u>
                  <i onClick={gotoEditPage}>选项</i>
                  <i onClick={toLogout}>退出登录</i>
                </u>
              </span>
            </h3>
          )}

          {isLogin && captureRepos.length === 0 && (
            <div className="toSetPos">
              <img src={toedit} alt="" onClick={bgApitest} />
              <p>暂无存储位置</p>
              <a onClick={gotoEditPage}>去配置</a>
            </div>
          )}

          {isLogin && captureRepos.length > 0 && <RuleEditor />}
          {isLogin && <img className="dlogoBox" src={dLogo} alt="" onClick={goDatapollo} />}
        </div>
      )}
    </>
  )
}

export default props => (
  <Provider>
    <Home {...props} />
  </Provider>
)
