import ScreenshotToolEvent from './screenshot-tool-event'

export default class ScreenshotTool {
  /**
   * 工具名称
   * @type {string}
   */
  #name = ''
  /**
   * 图标颜色
   * @type {string}
   */
  #color = 'white'

  /**
   * 禁用状态
   * @type {boolean}
   */
  #disabled = false
  /**
   * 激活状态
   * @type {boolean}
   */
  #active = false

  /**
   * 事件管理器
   * @type ScreenshotToolEvent
   */
  #events
  /**
   * 激活事件
   * @type Function
   */
  #activeEvent
  /**
   * 暂停事件
   * @type Function
   */
  #pauseEvent

  /**
   * 工具节点
   * @type HTMLElement
   */
  #node
  /**
   * 工具图标节点
   * @type HTMLElement
   */
  #iconNode

  /**
   * Screenshot constructor
   * @param name {string} 名称
   * @param iconClass {string} 图标类
   * @param [color='white'] {string} 图标默认颜色
   * @param [disabled] {boolean} 是否禁用
   * @param [clickEvent] {function} 点击方法
   * @param [activeEvent] {function} 激活方法
   * @param [pauseEvent] {function} 取消激活方法
   */
  constructor ({ name, iconClass, color, disabled, clickEvent, activeEvent, pauseEvent } = {}) {
    this.#node = document.createElement('div')
    this.#node.classList.add('screenshot-toolbar-tool')
    this.#initEvents()

    name && (this.name = name)
    color && (this.color = color)
    disabled && (this.disabled = disabled)
    iconClass && (this.iconClass = iconClass)
    activeEvent && (this.#activeEvent = activeEvent)
    pauseEvent && (this.#pauseEvent = pauseEvent)
    if (clickEvent) {
      this.events.add('click', clickEvent)
    }
  }

  get node () {
    return this.#node
  }

  get events () {
    return this.#events
  }

  get name () {
    return this.#name
  }

  set name (val) {
    this.#name = val
    this.node?.setAttribute('title', val)
  }

  get disabled () {
    return this.#disabled
  }

  set disabled (val) {
    this.#disabled = !!val
    if (val) {
      this.active = false
      this.node?.classList.add('disabled')
    } else {
      this.node?.classList.remove('disabled')
    }
  }

  get active () {
    return this.#active
  }

  set active (val) {
    if (this.active === !!val) {
      return
    }
    this.#active = !!val
    if (val) {
      this.disabled = false
      this.node?.classList.add('active')
      if (this.#activeEvent) {
        this.#activeEvent()
      }
    } else {
      this.node?.classList.remove('active')
      if (this.#pauseEvent) {
        this.#pauseEvent()
      }
    }
  }

  get color () {
    return this.#color
  }

  set color (val) {
    this.#color = val
    if (this.node) {
      this.node.style.color = val
    }
  }

  get iconClass () {
    return this.#iconNode.classList
  }

  set iconClass (val) {
    if (this.#iconNode) {
      this.#iconNode.remove()
    }
    if (this.node && val && val.trim()) {
      this.#iconNode = document.createElement('span')
      this.#iconNode.classList.add('icon', val.trim())
      this.node.append(this.#iconNode)
    }
  }

  #initEvents () {
    this.#events = new ScreenshotToolEvent(this.node)
  }
}
