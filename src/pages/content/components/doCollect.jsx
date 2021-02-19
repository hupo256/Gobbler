import React, { useState, useEffect, useContext } from 'react'
import { ctx } from '../context'

export default function MarkTips() {
  const { setpopupLayer, setdoMark } = useContext(ctx)
  useEffect(() => {}, [])

  return (
    <div className="chrome-plugin-collingBox">
      <p>
        <span>正在获取页面信息...</span>
      </p>
    </div>
  )
}
