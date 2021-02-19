import React, { useState, useEffect, useContext } from 'react'
import { setExclusionRule, getExcludedNodes, deleteExclusionRule, getExclusionRules } from '@src/api'
import { cssPath, removeArrItem, flatten, changeDomCls, Tooltips, touchInherDomArrs } from './uitls'
import { ctx } from '../context'
import del from '@assets/img/delete.svg'
import add from '@assets/img/add.svg'
import edit from '@assets/img/edit.svg'
import close from '@assets/img/close.svg'

const gobblerExclusionDom = 'gobblerExclusionDom'
const gobblerInheritanceDom = 'gobblerInheritanceDom'
const gobblerExclusionDom_show = 'gobblerExclusionDom_show'
const gobblerInheritanceDom_show = 'gobblerInheritanceDom_show'
const gobblerExclusionList = 'gobblerExclusionList'
const gobblerIncludedList = 'gobblerIncludedList'

export default function Exclusion() {
  const { setexclusion, showSlider, setshowSlider, editRule, seteditRule, exclusionRules, setExRules, dragPosition, setdragPosition, setisMove } = useContext(ctx)
  const [inheritanceXpaths, setinheritanceXpaths] = useState([])

  useEffect(() => {
    addChromeEvent()
    touchCurExcRule()

    // console.log(getNodeTextInfo(document.body))
  }, [])

  useEffect(() => {
    // 每次rules更新，都需要尝试删除之前的色块，加上当前的色块
    removeColorBlocks()
    renderRuleDom(exclusionRules)
  }, [exclusionRules])

  useEffect(() => {
    editRule && $('body').on('click.level', markEventHandle)

    $('.hoverabled').hover(
      e => toggleInherCls(e.target, 'addClass'),
      e => toggleInherCls(e.target, 'removeClass'),
    )
    return () => {
      $('body').off('click.level')
      $('.hoverabled').off()
    }
  }, [editRule])

  function toggleInherCls(dom, funKey) {
    const ind = $(dom).data('ruleindex')
    if (ind) {
      const ihnerTag = exclusionRules[0]?.noInheritanceFlag
      const { appliedFlag } = exclusionRules[ind]
      const isInher = !ihnerTag ? ihnerTag : appliedFlag
      const cls = isInher ? gobblerExclusionList : gobblerIncludedList
      changeDomCls(exclusionRules[ind].excludedXpaths, cls, funKey)
    }
  }

  // 根据数据渲染色块
  function renderRuleDom(domArr) {
    if (!domArr.length) return
    const { excludedXpaths = [], includedXpaths = [] } = domArr[0] || {}
    const inheritanceXpaths = touchInherDomArrs(domArr) //得到继承过来的dom
    const toRemoveDom = flatten([...excludedXpaths, ...includedXpaths])
    const inherDom = removeArrItem(toRemoveDom, inheritanceXpaths) // 当前规则最终继承的dom为，总的inher - 当前exclud - 当前 include
    setinheritanceXpaths(inheritanceXpaths.slice())

    // 开始渲染色块
    const inherCls = editRule ? gobblerInheritanceDom : gobblerInheritanceDom_show
    const excluCls = editRule ? gobblerExclusionDom : gobblerExclusionDom_show
    domArr[0].noInheritanceFlag && changeDomCls(inherDom, inherCls) // 继承
    changeDomCls(excludedXpaths, excluCls) // 排除
  }

  // 获取当页排除规则信息
  function touchCurExcRule() {
    const { hostname, pathname } = location
    const params = { webUri: `${hostname}${pathname}` }
    // const params = { webUri: 'todo.meizhilab.com/captureRul/att/index' }
    if (!(chrome && chrome.extension)) {
      getExcludedNodes(params).then(re => {
        if (!re) return
        const appliedFlags = {}
        const exclusionRuleIds = re.exclusionRules.map(rule => {
          const { exclusionRuleId, appliedFlag } = rule
          appliedFlags[exclusionRuleId] = appliedFlag
          return exclusionRuleId
        })
        const param = { exclusionRuleIds: exclusionRuleIds.join(), ...params }
        getExclusionRules(param).then(res => {
          if (!res) return
          const { exclusionRules } = res
          const exlRules = exclusionRules.map((rule, ind) => {
            const { exclusionRuleId, noInheritanceFlag } = rule
            ind || (rule.noInheritanceFlag = !noInheritanceFlag)
            const appliedFlag = appliedFlags[exclusionRuleId]
            return { ...rule, appliedFlag } // 将需要的信息合并进来
          })
          console.log(exlRules)
          setExRules(exlRules)
          seteditRule(true)
          setTimeout(() => {
            seteditRule(false)
          })
        })
      })
    } else {
      chrome.runtime.sendMessage({ getExcludedNodesTag: params })
    }
  }

  // 收集xpath, 切换高亮
  function markEventHandle(e) {
    e.preventDefault()
    let { excludedXpaths = [], includedXpaths = [] } = exclusionRules[0] || {}
    const el = e.target
    if (!(el instanceof Element)) return
    const { nodeName } = el
    if (nodeName === 'BODY' || nodeName === 'HTML') return
    const { selectPath, isPluginDom } = cssPath(el)
    if (isPluginDom) return
    const hasCls = $(el).hasClass(gobblerExclusionDom)
    const hasInherCls = $(el).hasClass(gobblerInheritanceDom)
    if (hasInherCls) {
      $(el).removeClass(gobblerInheritanceDom) // 包含
      includedXpaths.push(selectPath)
      setExRules(exclusionRules)
      return
    }
    if (hasCls) {
      $(el).removeClass(gobblerExclusionDom) // 删除
      const num = excludedXpaths.indexOf(selectPath)
      excludedXpaths.splice(num, 1)
    } else {
      $(el).addClass(gobblerExclusionDom) // 添加
      excludedXpaths.push(selectPath)
    }
    includedXpaths = removeArrItem([selectPath], includedXpaths)
    setExRules(exclusionRules)
  }

  function addChromeEvent() {
    if (!(chrome && chrome.extension)) return
    chrome.runtime.onMessage.addListener((msgCode, sender, sendResponse) => {
      const { exclusionRules } = msgCode || {}
      if (exclusionRules) {
        setExRules(exclusionRules)
        seteditRule(false)
      }
      sendResponse('exclusionRules done')
      return true
    })
  }

  function saveExclusion() {
    const rule = exclusionRules[0] || {}
    const { exclusionRuleId, exclusionUriPattern, noInheritanceFlag, excludedXpaths, includedXpaths } = rule
    const notInhExclusionRuleIds = []
    exclusionRules.map((item, ind) => {
      const { appliedFlag, exclusionRuleId } = item
      if (ind && !appliedFlag) notInhExclusionRuleIds.push(exclusionRuleId)
    })
    const data = {
      noInheritanceFlag: !noInheritanceFlag,
      notInhExclusionRuleIds: notInhExclusionRuleIds,
      excludedXpaths,
      includedXpaths,
      sampleWebUrl: location.href.split('://')[1],
    }
    const params = {
      exclusionRuleId,
      exclusionUriPattern,
    }
    console.log(data, params)

    // return
    if (!(chrome && chrome.extension)) {
      setExclusionRule(data, params).then(res => {
        seteditRule(false)
      })
    } else {
      chrome.runtime.sendMessage({ setExclusionRuleTag: { data, params } }, res => {
        console.log('save callback')
        seteditRule(false)
      })
    }
  }

  function delExcRule() {
    const { hostname, pathname } = location
    const { exclusionRuleId } = exclusionRules[0] || {}
    const param = { exclusionRuleId, webUri: `${hostname}${pathname}` }
    if (!(chrome && chrome.extension)) {
      deleteExclusionRule(param).then(res => {
        touchCurExcRule()
      })
    } else {
      chrome.runtime.sendMessage({ deleteExclusionRuleTag: param }, res => {
        console.log('delExcRule callbakc')
        touchCurExcRule()
      })
    }
  }

  function cancelEdit() {
    seteditRule(false)
    removeColorBlocks()
    touchCurExcRule()
  }

  // 生成switch
  function CreatCheckbox(props) {
    const { clickFun, keyDt, parentTag = true } = props
    const canToggle = editRule && parentTag
    return <span className={`chrome-plugin-switch ${keyDt ? 'checked' : ''} ${canToggle ? '' : 'blockDom'}`} onClick={clickFun} />
  }

  function toggleInherRule() {
    if (!editRule) return
    const { noInheritanceFlag } = exclusionRules[0]
    exclusionRules[0].noInheritanceFlag = !noInheritanceFlag
    setExRules(exclusionRules.slice())
  }

  function toggleApplied(bool, ind) {
    if (!editRule || !exclusionRules[0].noInheritanceFlag) return
    exclusionRules[ind].appliedFlag = !bool
    setExRules(exclusionRules.slice())
  }

  function removeColorBlocks() {
    const { excludedXpaths = [] } = exclusionRules[0] || {}
    excludedXpaths.length && changeDomCls(excludedXpaths, `${gobblerExclusionDom} ${gobblerExclusionDom_show}`, 'removeClass')
    inheritanceXpaths.length && changeDomCls(inheritanceXpaths, `${gobblerInheritanceDom} ${gobblerInheritanceDom_show}`, 'removeClass')
  }

  function addNewRule() {
    // 删除色块
    removeColorBlocks()
    setshowSlider(!showSlider)
  }

  function drag(ev) {
    const { clientX, clientY } = ev
    const { offsetLeft, offsetTop } = ev.target
    const pos = {
      x: clientX - offsetLeft,
      y: clientY - offsetTop,
    }
    setisMove(true)
    ev.dataTransfer.setData('Text', JSON.stringify(pos))

    setTimeout(() => {
      setdragPosition({ visibility: 'hidden' })
    }, 50)
  }

  const onInher = exclusionRules[0]?.noInheritanceFlag
  return (
    <div className="chrome-plugin-exclusionBox" draggable="true" onDragStart={drag} style={dragPosition}>
      <h3>
        <b>页面排除规则</b>
        {!editRule && (
          <span>
            <Tooltips text="删除" cls="bot">
              <img src={del} alt="" onClick={delExcRule} />
            </Tooltips>
            <Tooltips text="编辑" cls="bot">
              <img src={edit} alt="" onClick={() => seteditRule(true)} />
            </Tooltips>
            <Tooltips text="关闭" cls="bot">
              <img src={close} alt="" onClick={() => setexclusion(false)} />
            </Tooltips>
          </span>
        )}
      </h3>

      {exclusionRules.length > 0 && (
        <div className={`${editRule ? '' : 'disableDom'}`}>
          <p>{exclusionRules[0].exclusionUriPattern}</p>
          <p className="listTit">
            <span>继承上级规则</span>
            <CreatCheckbox keyDt={onInher} clickFun={toggleInherRule} />
          </p>

          <div className="listbox">
            <ul>
              {exclusionRules.map((rule, ind) => {
                const { exclusionUriPattern, appliedFlag, publicExclusionFlag, sampleWebUrl } = rule
                return (
                  ind > 0 && (
                    <li key={ind}>
                      <p>
                        <Tooltips text="优先级" cls="right">
                          <span>{ind}</span>
                        </Tooltips>
                        <span className="hoverabled" data-ruleindex={ind}>
                          {publicExclusionFlag && <i>公共</i>}
                          {exclusionUriPattern}
                        </span>
                        <CreatCheckbox keyDt={!onInher ? onInher : appliedFlag} parentTag={onInher} clickFun={() => toggleApplied(appliedFlag, ind)} />
                      </p>
                    </li>
                  )
                )
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="btnbox">
        <button onClick={cancelEdit}>取消</button>
        <button onClick={saveExclusion}>保存</button>
      </div>

      <p className={`addRuleBox ${editRule ? 'toOut' : ''}`}>
        {/* <span>todo.meizhilab.com/captureRul/att/index</span> */}
        <span>{`${location.hostname}${location.pathname}`}</span>

        <Tooltips text="添加一个新的规则" cls="left">
          <img src={add} alt="" onClick={addNewRule} />
        </Tooltips>
      </p>
    </div>
  )
}
