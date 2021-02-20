import React from 'react'
import ReactDOM from 'react-dom'
import config from '@src/config'
import App from './app'

const { appPrefix } = config
const gaToken = appPrefix + 'apiToken'
const guToken = appPrefix + 'userToken'

;(function addEvent() {
  if (!(chrome && chrome.runtime)) {
    ReactDOM.render(<App />, document.getElementById('chrome_ext_root'))
    return
  }

  chrome.runtime.onMessage.addListener((msgCode, sender, sendResponse) => {
    console.log('msgCode', msgCode)
    if (msgCode === 'loadContent') {
      const { hostname, pathname } = location
      sendResponse({ hostname, pathname })
    }
    let con = document.getElementById('chrome_ext_container')
    if (!con) {
      con = document.createElement('div')
      con.id = 'chrome_ext_container'
      document.body.appendChild(con)
    }
    ReactDOM.render(<App />, con)
  })
})()

// 尝试拿apiToken, page中的token转存到插件中以备用
if (chrome && chrome.runtime) {
  const GAToken = localStorage.getItem(gaToken)
  const GUToken = localStorage.getItem(guToken)
  console.log('GAToken', GAToken)
  // if (GAToken) {
  chrome.runtime.sendMessage({ tokenTag: { GAToken: GAToken || 'injection', GUToken } }, function(res) {
    console.log('成功给到toke')
  })
  // }
}
