export default class WebsocketHB {
  constructor({
    url,
    pingTimeout = 8000, // 发送心跳包间隔，默认 8000 毫秒
    pongTimeout = 15000, // 最长未接收消息的间隔，默认 15000 毫秒
    reconnectTimeout = 4000, // 每次重连间隔
    reconnectLimit = 15, // 最大重连次数
    pingMsg // 心跳包的消息内容
  }) {
    // 初始化配置
    this.url = url
    this.pingTimeout = pingTimeout
    this.pongTimeout = pongTimeout
    this.reconnectTimeout = reconnectTimeout
    this.reconnectLimit = reconnectLimit
    this.pingMsg = pingMsg

    // 实例变量
    this.ws = null
    this.pingTimer = null // 心跳包定时器
    this.pongTimer = null // 接收消息定时器
    this.reconnectTimer = null // 重连定时器
    this.reconnectCount = 0 // 当前的重连次数
    this.forbidReconnect = false // 禁止重连
    this.lockReconnect = false // 锁定重连

    this.createWebSocket()
  }

  // 创建 WS
  createWebSocket() {
    try {
      this.ws = new WebSocket(this.url)
      this.ws.onclose = () => {
        this.onclose()
        this.reconnect()
      }
      this.ws.onerror = () => {
        this.onerror()
        this.reconnect()
      }
      this.ws.onopen = () => {
        this.onopen()
        this.clearAllTimer()
        this.heartBeat()
        this.reconnectCount = 0
        this.lockReconnect = false
      }
      this.ws.onmessage = event => {
        this.onmessage(event)

        // 超时定时器
        clearTimeout(this.pongTimer)
        this.pongTimer = setTimeout(() => {
          this.reconnect()
        }, this.pongTimeout)
      }
    } catch (error) {
      console.error('websocket 连接失败!', error)
      throw error
    }
  }

  // 重连
  reconnect() {
    if (this.forbidReconnect) return
    if (this.lockReconnect) return
    if (this.reconnectCount > this.reconnectLimit) return
    if (this.checkIsLinking()) return

    this.lockReconnect = true
    this.reconnectCount += 1
    this.createWebSocket()
    this.reconnectTimer = setTimeout(() => {
      this.lockReconnect = false
      this.reconnect()
    }, this.reconnectTimeout)
  }

  // 检测是否在连接状态
  checkIsLinking() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  // 发送心跳包
  heartBeat() {
    this.pingTimer = setTimeout(() => {
      this.send(this.pingMsg)
      this.heartBeat()
    }, this.pingTimeout)
  }

  // 发送消息
  send(msg) {
    this.ws.send(msg)
  }

  // 清空所有定时器
  clearAllTimer() {
    clearTimeout(this.pingTimeout)
    clearTimeout(this.pongTimeout)
    clearTimeout(this.reconnectTimer)
  }

  // 销毁 ws
  destroyed() {
    // 如果手动关闭连接，不再重连
    this.forbidReconnect = true
    this.clearAllTimer()
    this.ws && this.ws.close()
  }
}