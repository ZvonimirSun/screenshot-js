import { removeAll } from './utils.js'

export default class ScreenshotToolEvent {
  constructor (node) {
    this._list = {}
    /**
     * 工具节点
     * @type HTMLElement
     */
    this._node = node
  }

  add (types, func) {
    if (!types) {
      throw new Error('Event must have types')
    }
    if (!func) {
      throw new Error('Function does not exist')
    }
    const typeList = types.split(',')
    for (const type of typeList) {
      this._list[type] = this._list[type] || []
      this._list[type].push(func)
      this._node && this._node.addEventListener(type, func)
    }
  }

  remove (types, func) {
    if (!types) {
      if (func) {
        for (const type in this._list) {
          removeAll(this._list[type], func, (event) => {
            if (event) {
              this._node && this._node.removeEventListener(type, event)
            }
          })
        }
      } else {
        for (const type in this._list) {
          for (const event of (this._list[type] || [])) {
            this._node && this._node.removeEventListener(type, event)
          }
          delete this._list[type]
        }
      }
    } else {
      const typeList = types.split(',').map(item => item.trim()).filter(item => !!item)
      if (func) {
        for (const type of typeList) {
          removeAll(this._list[type], func, (event) => {
            if (event) {
              this._node && this._node.removeEventListener(type, event)
            }
          })
        }
      } else {
        for (const type of typeList) {
          for (const event of (this._list[type] || [])) {
            this._node && this._node.removeEventListener(type, event)
          }
          delete this._list[type]
        }
      }
    }
  }
}
