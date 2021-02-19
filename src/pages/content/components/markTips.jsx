import React, { useState, useEffect, useContext } from 'react'
import { ctx } from '../context'

export default function MarkTips() {
  const { markTips, setmarkTips } = useContext(ctx)
  useEffect(() => {}, [])

  function continueDoMark() {
    setmarkTips(!markTips)
    settotalTips(20)
  }

  return (
    <div className="chrome-plugin-markTipsBox">
      <div>
        <h3>继续标注</h3>
        <p>您已完成10条标注，获得20无代金券</p>

        <p className="pt1em">继续标注将获得更多奖励</p>

        <div className="btnBox">
          <button onClick={() => setmarkTips(!markTips)}>结束</button>
          <button onClick={continueDoMark}>继续标注</button>
        </div>
      </div>
    </div>
  )
}
