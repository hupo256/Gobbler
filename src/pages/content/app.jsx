import React, { useEffect, useContext } from 'react'
import { Provider, ctx } from './context'
import PopLayer from './components/popLayer'
import UrlSlider from './components/urlSlider'
import MarkTips from './components/markTips'
import Exclusion from './components/exclusion'
import DoMark from './components/doMark'
import DoCollect from './components/doCollect'
import getNodeTextInfo from './components/getNodeTextInfo'
import { createUuid } from '@src/common/tools'

// import '../../assets/content.css'

const pageUid = createUuid()
let invTime = 3000 // 防抖间隔
let timer // 定时器，用来 setTimeout
let GobblerCollected = true // true为不用抓取，或已抓取。false为尚未抓取

// 页面框架开始
function Home() {
  const {
    exclusion,
    showSlider,
    setshowSlider,
    setexclusion,
    setdoMark,
    popupLayer,
    setfromPop,
    doMark,
    markTips,
    doCollect,
    setdragPosition,
    isMove,
    setisMove,
    setcaptureRepoId,
    setcaptureRuleId,
  } = useContext(ctx)
  useEffect(() => {
    if (!chrome.runtime) return
    bindChromeEvent()
    touchWorkTag() // 问后台，这个要抓取吗
  }, [])

  // 监听后台事件
  function bindChromeEvent() {
    chrome.runtime.onMessage.addListener((msgCode, sender, sendResponse) => {
      console.log('bgRes:', msgCode)
      if (typeof msgCode === 'string') {
        if (msgCode === 'toExclusion') setexclusion(true)
        if (msgCode === 'toDoMark') setdoMark(true)
      }
      if (typeof msgCode === 'object') {
        const { captureTime, isWork, prevTab, captureRepoId, captureRuleId } = msgCode
        //执行抓取
        captureTime && contenttoDB(captureTime)
        // 后台说这个要抓取
        isWork && addEventForCollect()
        // tab切换时尝试生成一个新任务
        prevTab && sendResponse({ pageUid: GobblerCollected ? '' : pageUid })

        if (captureRepoId) {
          // 从popup来的信号
          setshowSlider(true)
          setfromPop(true)
          setcaptureRepoId(captureRepoId)
          setcaptureRuleId(captureRuleId)
        }
      }
    })
  }

  // 给后台一个信号，保存数据
  function contenttoDB(curTime = Date.now()) {
    const { hostname, pathname } = location
    const putInDBTag = {
      captureTime: curTime,
      webUri: hostname + pathname,
      webTitle: document.title,
      webCaptureNodes: getNodeTextInfo(document.body),
    }
    chrome.runtime.sendMessage({ putInDBTag }, res => {
      console.log('========>> 数据保存成功') // 收到回调表示保存成功
      GobblerCollected = true
      window.onbeforeunload = null // 取消监听关闭事件
    })
  }

  // 注册相关事件
  function addEventForCollect() {
    GobblerCollected = false // 页面需要收集
    $(window).scroll(function() {
      const scrollTop = $(this).scrollTop()
      const scrollHeight = $(document).height()
      const windowHeight = $(this).height()
      if (scrollTop + windowHeight + 50 > scrollHeight) {
        console.log('arrive bottom')
        sendPageUid()
      }
    })

    addbeforeunload()
  }

  function touchWorkTag() {
    const { hostname, pathname } = location
    const isWorkTag = hostname + pathname
    chrome.runtime.sendMessage({ isWorkTag })
  }

  // 进入页面监听关闭事件
  function addbeforeunload() {
    window.onbeforeunload = () => {
      return ''
    }
  }

  // 告诉后台生成一个任务
  function sendPageUid() {
    if (GobblerCollected) return // 为true则跳过
    console.log($('.chrome-plugin-processer'))
    $('.chrome-plugin-processer')
      .show(50)
      .addClass('processer-full')
    setTimeout(() => {
      $('.chrome-plugin-processer')
        .hide(50)
        .removeClass('processer-full')
    }, 3000)
    debounce(() => {
      let pageUidTag = { pageUid }
      chrome.runtime.sendMessage({ pageUidTag })
    }, invTime / 3)()
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

  function allowDrop(ev) {
    ev.preventDefault()
  }

  function drop(ev) {
    ev.preventDefault()
    const { clientX, clientY } = ev
    const { x, y } = JSON.parse(ev.dataTransfer.getData('Text'))
    const pos = {
      top: clientY - y,
      left: clientX - x,
      right: 'auto',
      visibility: 'visible',
    }
    setisMove(false)
    setdragPosition(pos)
  }

  return (
    <div className={`chrome-plugin-content ${isMove ? 'chrome-plugin-hasEvents' : ''}`} onDrop={drop} onDragOver={allowDrop}>
      {/* 帮助我们标注该网站数据 */}
      {popupLayer && <PopLayer />}

      {/* 标注提示 */}
      {markTips && <MarkTips />}

      {/* 采集排除 */}
      {exclusion && <Exclusion />}

      {/* 标注操作 */}
      {doMark && <DoMark />}

      {/* 自动采集 */}
      {doCollect && <DoCollect />}

      {/* 设置采集页面 */}
      {showSlider && <UrlSlider />}

      <div className="chrome-plugin-processer"></div>
    </div>
  )
}

export default props => (
  <Provider>
    <Home {...props} />
  </Provider>
)
