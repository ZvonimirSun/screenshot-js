import ScreenshotToolEvent from './screenshot-tool-event'

export default class ScreenshotTool {
  /**
   * Screenshot constructor
   * @param name {string} 名称
   * @param icon {string} 图标类
   * @param [color='white'] {string} 图标默认颜色
   * @param [disabled] {boolean} 是否禁用
   * @param [clickEvent] {function} 点击方法
   * @param [activeEvent] {function} 激活方法
   * @param [pauseEvent] {function} 取消激活方法
   */
  constructor ({ name, icon, color, disabled, clickEvent, activeEvent, pauseEvent } = {}) {
    /**
     * 工具名称
     * @type {string}
     */
    this._name = ''
    /**
     * 图标颜色
     * @type {string}
     */
    this._color = 'white'

    /**
     * 禁用状态
     * @type {boolean}
     */
    this._disabled = false
    /**
     * 激活状态
     * @type {boolean}
     */
    this._active = false

    /**
     * 事件管理器
     * @type ScreenshotToolEvent
     */
    this._events = undefined
    /**
     * 激活事件
     * @type Function
     */
    this._activeEvent = undefined
    /**
     * 暂停事件
     * @type Function
     */
    this._pauseEvent = undefined

    /**
     * 工具节点
     * @type HTMLElement
     */
    this._node = undefined
    /**
     * 工具图标节点
     * @type HTMLElement
     */
    this._iconNode = undefined

    this._node = document.createElement('div')
    this._node.classList.add('screenshot-toolbar-tool')
    this._initEvents()

    name && (this.name = name)
    color && (this.color = color)
    disabled && (this.disabled = disabled)
    icon && (this.icon = icon)
    activeEvent && (this._activeEvent = activeEvent)
    pauseEvent && (this._pauseEvent = pauseEvent)
    if (clickEvent) {
      this.events.add('click', clickEvent)
    }
  }

  get node () {
    return this._node
  }

  get events () {
    return this._events
  }

  get name () {
    return this._name
  }

  set name (val) {
    this._name = val
    this.node && this.node.setAttribute('title', val)
  }

  get disabled () {
    return this._disabled
  }

  set disabled (val) {
    this._disabled = !!val
    if (val) {
      this.active = false
      this.node && this.node.classList.add('disabled')
    } else {
      this.node && this.node.classList.remove('disabled')
    }
  }

  get active () {
    return this._active
  }

  set active (val) {
    if (this.active === !!val) {
      return
    }
    this._active = !!val
    if (val) {
      this.disabled = false
      this.node && this.node.classList.add('active')
      if (this._activeEvent) {
        this._activeEvent()
      }
    } else {
      this.node && this.node.classList.remove('active')
      if (this._pauseEvent) {
        this._pauseEvent()
      }
    }
  }

  get color () {
    return this._color
  }

  set color (val) {
    this._color = val
    if (this.node) {
      this.node.style.color = val
    }
  }

  get icon () {
    return this._iconNode.classList
  }

  set icon (val) {
    if (this._iconNode) {
      this._iconNode.remove()
    }
    if (this.node && val && val.trim()) {
      this._iconNode = document.createElement('span')
      this._iconNode.classList.add('screenshot-icon', 'icon-s-' + val.trim())
      this.node.append(this._iconNode)
    }
  }

  _initEvents () {
    this._events = new ScreenshotToolEvent(this.node)
  }
}
