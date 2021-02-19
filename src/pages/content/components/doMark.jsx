import React, { useState, useEffect, useContext } from 'react'
import { ctx } from '../context'
import $ from 'jquery'

const totalTipsArr = [10, 20, 40, 80]
export default function doMark() {
  const { doMark, setdoMark } = useContext(ctx)
  const [totalLevl, settotalLevl] = useState(0) // 要标记的总条数
  const [markedNum, setsettipsNum] = useState(0) // 当前标记条数

  useEffect(() => {
    // console.log('done')
    bindEvent()
  }, [markedNum])

  function bindEvent() {
    $('body').one('click', '.attver', markEventHandle)
  }

  function finishMark(e) {
    console.log(e)
    setdoMark(false)
  }

  function addNewMark(e) {
    const num = markedNum + 1
    const len = totalTipsArr.length
    if (num > totalTipsArr[len - 1]) return
    if (num === totalTipsArr[totalLevl]) {
      const leve = totalLevl + 1
      if (leve < len) settotalLevl(leve)
    }
    setsettipsNum(num)
  }

  return (
    <div className="chrome-plugin-markBox">
      <div className="numBox">
        <h3>{`已标注(${markedNum ? markedNum : 0}/${totalTipsArr[totalLevl]})`}</h3>
        <p>
          <span style={{ width: `${markedNum ? (markedNum * 100) / totalTipsArr[totalLevl] : 1}%` }}></span>
        </p>
      </div>

      <div className="operation">
        <i>撤销</i>
        <i>跳过</i>
        <button type="primary" size="small" onClick={finishMark}>
          完成
        </button>
      </div>
    </div>
  )
}
