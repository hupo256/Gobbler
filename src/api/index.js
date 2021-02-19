import request from '@src/service'
const baseURL = '/rpasource/gobbler'

// 上传抓取的节点信息
export function subscribeWebCapture(url, params) {
  return request(url, {
    method: 'POST',
    data: { ...params },
  })
}

// 获取DataHub的授权信息, 用于直传网页抓取文本
export function getUploadTextAuth(params) {
  return request(`${baseURL}/uploadAuth/text`, {
    method: 'GET',
    params: params,
  })
}

// 获取用户信息
export function getUserProfile(params) {
  return request(`/usam/user/profile`, {
    method: 'GET',
    params: params,
  })
}

// 获取可用于 Gobbler 的源数据单元
export function getOptions(params) {
  return request(`${baseURL}/option`, {
    method: 'GET',
    params: params,
  })
}

// 增删改网页抓取规则
export function alterCaptureRules(params) {
  return request(`${baseURL}/option/captureRule`, {
    method: 'PUT',
    data: { ...params },
  })
}

// [业务集团] 开通 Gobbler 服务
export function activateGobblerService(params) {
  return request(`${baseURL}/activate`, {
    method: 'POST',
    data: { ...params },
  })
}

// [业务集团] 创建一组 Gobbler 所需的存储池
export function createGobblerStorage(params) {
  return request(`${baseURL}/storage`, {
    method: 'POST',
    data: { ...params },
  })
}

// 获取可用于 Gobbler 的源数据单元
export function getSourceDataUnits() {
  return request(`${baseURL}/sourceDataUnit`, {
    method: 'GET',
  })
}

// 设置网页抓取仓库
export function setCaptureRepo(params) {
  return request(`${baseURL}/option/captureRepo`, {
    method: 'PUT',
    data: { ...params },
  })
}

// 获取当前页面的排除节点, 仅在当前页面需要抓取时调用
export function getExcludedNodes(params) {
  return request(`${baseURL}/exclusion`, {
    method: 'GET',
    params: params,
  })
}

// 设置页面的排除规则, 用于排除特定的页面节点以不被抓取
export function setExclusionRule(data, params) {
  return request(`${baseURL}/exclusion/rule`, {
    method: 'PUT',
    data: { ...data },
    params: params,
  })
}

// 删除一条排除规则
export function deleteExclusionRule(params) {
  return request(`${baseURL}/exclusion/rule`, {
    method: 'DELETE',
    params: params,
  })
}

// 批量获取页面的排除规则
export function getExclusionRules(params) {
  return request(`${baseURL}/exclusion/rule`, {
    method: 'GET',
    params: params,
  })
}
