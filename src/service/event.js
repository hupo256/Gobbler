export default class EmitterEvent {
  constructor() {
    //构造器。实例上创建一个事件池
    this._event = {}
    this.cache = {}
    this.timeId = null
  }
  //on 订阅
  on(eventName, handler) {
    if (this._event[eventName]) {
      this._event[eventName].push(handler)
    } else {
      this._event[eventName] = [handler]
    }
  }
  emit(eventName) {
    // 根据eventName找到对应数组
    var events = this._event[eventName]
    //  取一下传进来的参数，方便给执行的函数
    var otherArgs = Array.prototype.slice.call(arguments, 1)
    var that = this
    if (events) {
      events.forEach(event => {
        event.apply(that, otherArgs)
      })
    }
  }
  // 解除订阅
  off(eventName, handler) {
    var events = this._event[eventName]
    if (events) {
      this._event[eventName] = events.filter(event => {
        return event !== handler
      })
    }
  }
  // 订阅以后，emit 发布执行一次后自动解除订阅
  once(eventName, handler) {
    var that = this
    function func() {
      var args = Array.prototype.slice.call(arguments, 0)
      handler.apply(that, args)
      this.off(eventName, func)
    }
    this.on(eventName, func)
  }
  // 定时清除
  clearCache(time) {
    if (!this.timeId) {
      this.timeId = setTimeout(() => {
        this.cache = {}
        this._event = {}
      }, time)
    }
  }
}
