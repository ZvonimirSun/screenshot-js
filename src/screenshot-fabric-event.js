import { removeAll } from './utils.js'

export default class ScreenshotFabricEvent {
  constructor (node) {
    this._list = {}
    /**
     * @type {fabric.Canvas}
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
      this._node && this._node.on(type, func)
    }
  }

  remove (types, func) {
    if (!types) {
      if (func) {
        for (const type in this._list) {
          removeAll(this._list[type], func, (event) => {
            if (event) {
              this._node && this._node.off(type, event)
            }
          })
        }
      } else {
        for (const type in this._list) {
          this._node && this._node.off(type)
          delete this._list[type]
        }
      }
    } else {
      const typeList = types.split(',').map(item => item.trim()).filter(item => !!item)
      if (func) {
        for (const type of typeList) {
          removeAll(this._list[type], func, (event) => {
            if (event) {
              this._node && this._node.off(type, event)
            }
          })
        }
      } else {
        for (const type of typeList) {
          this._node && this._node.off(type)
          delete this._list[type]
        }
      }
    }
  }
}
