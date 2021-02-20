import React, { useState, useEffect, useContext, useRef } from 'react'
import { ctx } from '../context'
import { Select, Tooltip } from 'antd'
import { RightOutlined, EditOutlined } from '@ant-design/icons'
import { sendMessageToContentScript, touchCurRule, touchUriObj } from '@src/common/tools'
import { alterCaptureRules } from '@src/api'
import config from '@src/config'

const { appPrefix } = config
const { Option } = Select
export default function RuleInfo() {
  const { captureRepos, accountId, captureRules } = useContext(ctx)
  const [urlObj, seturlObj] = useState(null)
  const [useRule, setuseRule] = useState(false)
  const [curRepoId, setcurRepoId] = useState('')
  const [curRuleId, setcurRuleId] = useState('')
  const [opneCollect, setopneCollect] = useState(false)
  const selectEl = useRef()

  useEffect(() => {
    // 一进来，先找到默认的captureRepoId
    let { captureRepoId } = captureRepos.filter(repo => repo.defaultFlag)[0] || {}
    captureRepos.length === 1 && (captureRepoId = captureRepos[0].captureRepoId)
    setcurRepoId(captureRepoId)
  }, [])

  useEffect(() => {
    touchTheUrl() // 刷新url
  }, [captureRules])

  function touchTheUrl() {
    if (!chrome.extension) {
      // const { hostname, pathname } = location
      const hostname = 'dev.meizhilab.com'
      const pathname = '/portal/dashboard'
      seturlObj({ hostname, pathname })
      touchIDs(`${hostname}${pathname}`)
    } else {
      // 向content发一个信号，请求当前页的uri
      sendMessageToContentScript('loadContent', res => {
        const bg = chrome.extension.getBackgroundPage()
        const { urlObj } = bg.touchGobblerBGData()
        const cObj = urlObj || res // bg有url表示已经设置过了
        seturlObj(cObj)
        const theUrl = cObj ? `${cObj.hostname}${cObj.pathname}` : ''
        touchIDs(theUrl)
      })
    }
  }

  function touchIDs(cUrl) {
    if (!cUrl) return
    const curRule = touchCurRule(cUrl, captureRules) // 先拿到当前的rui, 然后匹配出最高的规则
    const { captureRepoId = '', captureRuleId = '', webUriPattern = '' } = curRule
    if (!captureRuleId || !webUriPattern) return
    const { host, path } = touchUriObj(webUriPattern)
    setopneCollect(true)
    setuseRule(true)
    setcurRepoId(captureRepoId)
    setcurRuleId(captureRuleId)
    seturlObj({ hostname: host, pathname: `/${path.join('/')}` })
  }

  function sendToContentPage(key) {
    if (!opneCollect) return
    let paramData = key
    if (key === 'toShowSlider') {
      paramData = {
        captureRuleId: curRuleId,
        captureRepoId: curRepoId,
      }
    }
    sendMessageToContentScript(paramData, res => {
      window.close()
    })
  }

  function selectChange(val) {
    setcurRepoId(val)
    doAlterCaptureRules(val)
  }

  function toUserRule() {
    if (!opneCollect) return
    setuseRule(true)
    doAlterCaptureRules()
  }

  function doAlterCaptureRules(repoId) {
    const theUrl = `${urlObj.hostname}${urlObj.pathname}`
    const params = {
      captureRuleId: curRuleId,
      deleteFlag: false,
      webUriPattern: theUrl,
      captureRepoId: repoId || curRepoId,
    }
    // return
    alterCaptureRules({ captureRules: [params] })

    // 将相关的信息存到DB
    const usrInfor = {
      id: appPrefix + 'user',
      accountId,
      captureRules,
      apiUrl: APIUrl,
      baseUrl: BASEUrl,
      thenUrl: theUrl, // 顺便记录一下当时的url
    }
    chrome.runtime && chrome.runtime.sendMessage({ GobblerUserTag: usrInfor })
  }

  // 生成switch
  function CreatCheckbox(props) {
    const { clickFun, keyDt, parentTag = true } = props
    const canToggle = parentTag
    return <span className={`chrome-plugin-switch ${keyDt ? 'checked' : ''} ${canToggle ? '' : 'blockDom'}`} onClick={clickFun} />
  }

  return (
    <div className="switchOut">
      <p className="switch">
        <b>采集数据</b>
        <CreatCheckbox keyDt={opneCollect} clickFun={() => setopneCollect(!opneCollect)} />
      </p>
      {!useRule ? (
        <div className={`optBox ${opneCollect ? '' : 'disableDom'}`}>
          <ul>
            <li className="urlbox">
              <span>{urlObj && <span className="tagetUrl">{`${urlObj.hostname}${urlObj.pathname}`}</span>}</span>
              <CreatCheckbox keyDt={!opneCollect} clickFun={toUserRule} />
            </li>
          </ul>
        </div>
      ) : (
        <div className={`optBox ${opneCollect ? '' : 'disableDom'}`}>
          <ul>
            <li className="urlbox">
              <span>
                {urlObj && <span className="tagetUrl">{`${urlObj.hostname}${urlObj.pathname}`}</span>}
                <EditOutlined style={{ color: 'rgba(47, 84, 235, 1)' }} onClick={() => sendToContentPage('toShowSlider')} />
              </span>
              <Tooltip title="添加条件">
                <CreatCheckbox keyDt={useRule} clickFun={() => setuseRule(!useRule)} />
              </Tooltip>
            </li>
            <li>
              <span>存储至</span>
              <Select ref={selectEl} value={curRepoId} style={{ width: 275 }} size="small" onChange={selectChange}>
                {captureRepos.map(repo => {
                  const { captureRepoId, captureRepoName } = repo
                  return (
                    <Option key={captureRepoId} value={captureRepoId}>
                      {captureRepoName}
                    </Option>
                  )
                })}
              </Select>
            </li>
            <li onClick={() => sendToContentPage('toExclusion')} className="curpoint">
              <span>查看不采集的元素</span>
              <RightOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />
            </li>
          </ul>
          <li className="toTagInfo">
            <span>标注网页信息结构</span>
            <RightOutlined style={{ color: 'rgba(0, 0, 0, 0.25)' }} />
          </li>
        </div>
      )}
    </div>
  )
}
