export default class ScreenShotTool {
  /**
   * ScreenShot constructor
   * @param name {string} 名称
   * @param iconClass {string} 图标类
   * @param [color='white'] {string} 图标默认颜色
   * @param [disabled] {boolean} 是否禁用
   * @param [clickEvent] {function} 点击方法
   * @param [activeEvent] {function} 激活方法
   * @param [pauseEvent] {function} 取消激活方法
   */
  constructor ({ name = '', iconClass, color = 'white', disabled = false, clickEvent, activeEvent, pauseEvent } = {}) {
    this._dom = document.createElement('div')
    this._dom.classList.add('screenshot-toolbar-tool')
    this._initEvents()

    this.name = name
    this.color = color
    this.disabled = disabled
    this.active = false
    this.iconClass = iconClass
    this._activeEvent = activeEvent
    this._pauseEvent = pauseEvent
    if (clickEvent) {
      this.events.add('click', clickEvent)
    }
  }

  get dom () {
    return this._dom
  }

  get events () {
    return this._events
  }

  get name () {
    return this._name
  }

  set name (val) {
    this._name = val
    this.dom?.setAttribute('title', val)
  }

  get disabled () {
    return this._disabled
  }

  set disabled (val) {
    this._disabled = !!val
    if (val) {
      this.active = false
      this.dom?.classList.add('disabled')
    } else {
      this.dom?.classList.remove('disabled')
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
      this.dom?.classList.add('active')
      if (this._activeEvent) {
        this._activeEvent()
      }
    } else {
      this.dom?.classList.remove('active')
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
    if (this.dom) {
      this.dom.style.color = val
    }
  }

  get iconClass () {
    return this._iconDom.classList
  }

  set iconClass (val) {
    if (this._iconDom) {
      this._iconDom.remove()
    }
    if (this.dom && val && val.trim()) {
      this._iconDom = document.createElement('span')
      this._iconDom.classList.add('icon', val.trim())
      this.dom.append(this._iconDom)
    }
  }

  _initEvents () {
    const dom = this.dom
    this._events = {
      list: {},
      add (types, func) {
        if (!types) {
          throw new Error('Event must have types')
        }
        if (!func) {
          throw new Error('Function does not exist')
        }
        const typeList = types.split(',')
        for (const type of typeList) {
          this.list[type] = this.list[type] || []
          this.list[type].push(func)
          dom?.addEventListener(type, func)
        }
      },
      remove (types, func) {
        if (!types) {
          if (func) {
            for (const type in this.list) {
              this._removeAll(this.list[type], func, (event) => {
                if (event) {
                  dom?.removeEventListener(type, event)
                }
              })
            }
          } else {
            for (const type in this.list) {
              for (const event of (this.list[type] || [])) {
                dom?.removeEventListener(type, event)
              }
              delete this.list[type]
            }
          }
        } else {
          const typeList = types.split(',').map(item => item.trim()).filter(item => !!item)
          if (func) {
            for (const type of typeList) {
              this._removeAll(this.list[type], func, (event) => {
                if (event) {
                  dom?.removeEventListener(type, event)
                }
              })
            }
          } else {
            for (const type of typeList) {
              for (const event of (this.list[type] || [])) {
                dom?.removeEventListener(type, event)
              }
              delete this.list[type]
            }
          }
        }
      },
      _removeAll (list = [], item, callback = () => {}) {
        let index = list.indexOf(item)
        while (index > -1) {
          callback(list.splice(index, 1)[0])
          index = list.indexOf(item)
        }
      }
    }
  }
}
