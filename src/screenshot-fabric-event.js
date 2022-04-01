import { removeAll } from './utils.js'

export default class ScreenshotFabricEvent {
  #list = {}
  /**
   * @type {fabric.Canvas}
   */
  #node

  constructor (node) {
    this.#node = node
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
      this.#list[type] = this.#list[type] || []
      this.#list[type].push(func)
      this.#node?.on(type, func)
    }
  }

  remove (types, func) {
    if (!types) {
      if (func) {
        for (const type in this.#list) {
          removeAll(this.#list[type], func, (event) => {
            if (event) {
              this.#node?.off(type, event)
            }
          })
        }
      } else {
        for (const type in this.#list) {
          this.#node?.off(type)
          delete this.#list[type]
        }
      }
    } else {
      const typeList = types.split(',').map(item => item.trim()).filter(item => !!item)
      if (func) {
        for (const type of typeList) {
          removeAll(this.#list[type], func, (event) => {
            if (event) {
              this.#node?.off(type, event)
            }
          })
        }
      } else {
        for (const type of typeList) {
          this.#node?.off(type)
          delete this.#list[type]
        }
      }
    }
  }
}
