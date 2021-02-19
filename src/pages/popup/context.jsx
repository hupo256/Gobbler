import React, { createContext, useState } from 'react'

export const ctx = createContext({})
export function Provider({ children }) {
  const [useRule, setuseRule] = useState(true)
  const [urlObj, seturlObj] = useState(null)
  const [captureRepos, setcaptureRepos] = useState([])
  const [accountId, setaccountId] = useState([])
  const [captureRules, setcaptureRules] = useState([])

  const value = {
    useRule,
    setuseRule,
    urlObj,
    seturlObj,
    captureRepos,
    setcaptureRepos,
    accountId,
    setaccountId,
    captureRules,
    setcaptureRules,
  }

  return <ctx.Provider value={value}>{children}</ctx.Provider>
}
