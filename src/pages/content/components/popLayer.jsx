import React, { useEffect, useContext, useState } from 'react'
import { ctx } from '../context'
import getNodeTextInfo from './getNodeTextInfo'
import { getUploadTextAuth } from '@src/api'
import { createUuid, GetCrc32 } from '@src/common/tools'

export default function MarkTips() {
  const { setpopupLayer, setshowSlider, setdoMark, setdoCollect, doCollect } = useContext(ctx)
  let db

  useEffect(() => {
    getUploadTextAuth().then(res => {
      console.log(res)
    })
  }, [])

  async function goAheard() {
    console.log(getNodeTextInfo(document.body))
  }

  function contenttoDB() {
    const putInDB = {
      id: `TOVERIFY:${createUuid()}`,
      accountId: 'ac-24pn9mbz7k00',
      captureRepoId: 'crp-29yx6ah0xs00',
      captureTime: Date.now(),
      webUri: 'https://juejin.cn/post/6844904008067334157',
      webTitle: 'WWWAAA',
      webCaptureNodes: getNodeTextInfo(document.body),
    }
    if (!(chrome && chrome.extension)) {
      addToDB(putInDB)
    } else {
      chrome.runtime.sendMessage({ putInDB })
    }
  }

  /**
   * 待上传Loop
   */
  async function toUploadLoop() {
    const keys = await getAllKeys()
    const touploadKeys = keys.filter(key => key.includes('TOUPLOAD:'))
    touploadKeys.length > 0 // 找到就开始操作，不然后等会儿再找一次
      ? doUploadCell(touploadKeys)
      : setTimeout(() => {
          toUploadLoop()
        }, 5000)
  }

  async function doUploadCell(keys) {
    const curKey = keys.shift()
    if (!curKey) {
      toUploadLoop() //队列操作完了，尝试进入下个loop
      return
    }
    const uploadData = await getInDB(curKey) // 取出一个

    // 开始上传
    // submitNodeList(uploadData)
    console.log('开始上传')
    console.log(uploadData)
    console.log('删除，然后下一个')
  }

  /**
   * CRC32校验Loop
   */
  async function CRC32Loop() {
    const keys = await getAllKeys()
    const toVerifyKeys = keys.filter(key => key.includes('TOVERIFY:'))
    toVerifyKeys.length > 0 // 找到就开始操作，不然后等会儿再找一次
      ? doCRCCell(toVerifyKeys)
      : setTimeout(() => {
          CRC32Loop()
        }, 5000)
  }

  async function doCRCCell(keys) {
    const curKey = keys.shift()
    if (!curKey) {
      CRC32Loop() //队列操作完了，尝试进入下个loop
      return
    }
    const verifyData = await getInDB(curKey) // 取出一个
    let { CRCList = [] } = (await getInDB('CRC32S')) || {}
    console.log(CRCList)
    const { webCaptureNodes = [], captureRepoId = '' } = verifyData
    const textList = webCaptureNodes.map(item => item.text)
    const crcNmb = GetCrc32(JSON.stringify(textList) + JSON.stringify(captureRepoId))
    console.log(crcNmb)
    const ind = CRCList.indexOf(crcNmb)
    await updateArr(CRCList, crcNmb, ind) // 更新CRC32s, 是个异步操作

    // 要不要转存?
    ind === -1 && (await addToDB({ ...verifyData, id: `TOUPLOAD:${createUuid()}` }))
    delInDB(curKey).then(res => {
      doCRCCell(keys) // 删除然后进行下一个
    })
  }

  // 更新CRC32s
  function updateArr(arr, item, num) {
    console.log(arr, item)
    num > -1 && arr.splice(num, 1)
    arr.push(item)
    arr.length > 20 && arr.shift()
    addToDB({
      id: `CRC32S`,
      CRCList: arr, // 顺便更新db里的list
    })
  }

  function delInDB(key) {
    return creatStoreEvent({ type: 'delete', param: key })
  }

  function getInDB(key) {
    return creatStoreEvent({ type: 'get', param: key })
  }

  function addToDB(param) {
    return creatStoreEvent({ type: 'put', param })
  }

  function getAllKeys() {
    return creatStoreEvent({ type: 'getAllKeys' })
  }

  function creatStoreEvent(config) {
    const { type = '', param = null } = config || {}
    return new Promise((resolve, reject) => {
      db
        .transaction(['page'], 'readwrite')
        .objectStore('page')
        [type](param).onsuccess = e => {
        console.log(type + ' done')
        const { result } = e.target
        e.type === 'success' ? resolve(result) : reject('fail')
      }
    })
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('gdb', 1)
      request.onsuccess = e => {
        db = e.target.result
        resolve(e.target.result)
      }
      request.onerror = e => reject(e)
      request.onupgradeneeded = e => {
        db = e.target.result
        if (!db.objectStoreNames.contains('page')) {
          db.createObjectStore('page', {
            keyPath: 'id',
            autoIncrement: true,
          })
        }
      }
    })
  }

  return (
    <div className="chrome-plugin-popuplayerBox">
      <span>帮助我们标注该网站数据</span>
      <p>
        <span onClick={() => setpopupLayer(false)}>取消</span>
        <button onClick={goAheard}>去标注 </button>
      </p>
    </div>
  )
}
