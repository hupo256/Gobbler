import React, { createContext, useState } from 'react'

export const ctx = createContext({})
export function Provider({ children }) {
  const [exclusion, setexclusion] = useState(false) // 采集排除
  const [popupLayer, setpopupLayer] = useState(false) // 帮助我们标注
  const [showSlider, setshowSlider] = useState(false) // 调节采集范围
  const [doMark, setdoMark] = useState(false) // 标注操作栏
  const [markTips, setmarkTips] = useState(false) // 奖励提示
  const [doCollect, setdoCollect] = useState(false) // 自动获得页面信息
  const [editRule, seteditRule] = useState(false) // 排除规则是否进入可编辑状态
  const [exclusionRules, setExRules] = useState([]) // 排除规则们
  const [dragPosition, setdragPosition] = useState({}) // 排除规则们
  const [isMove, setisMove] = useState(false) // 是否在移动
  const [fromPop, setfromPop] = useState(false) // 是否在移动
  const [captureRepoId, setcaptureRepoId] = useState('') // 当前id
  const [captureRuleId, setcaptureRuleId] = useState('') // 当前id

  const value = {
    exclusion,
    setexclusion,
    showSlider,
    setshowSlider,
    doMark,
    setdoMark,
    markTips,
    setmarkTips,
    doCollect,
    setdoCollect,
    popupLayer,
    setpopupLayer,
    editRule,
    seteditRule,
    exclusionRules,
    setExRules,
    dragPosition,
    setdragPosition,
    isMove,
    setisMove,
    fromPop,
    setfromPop,
    captureRepoId,
    setcaptureRepoId,
    captureRuleId,
    setcaptureRuleId,
  }

  return <ctx.Provider value={value}>{children}</ctx.Provider>
}
