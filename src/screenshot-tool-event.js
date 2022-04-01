import { removeAll } from './utils.js'

export default class ScreenShotToolEvent {
  #list = {}
  /**
   * 工具节点
   * @type HTMLElement
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
      this.#node?.addEventListener(type, func)
    }
  }

  remove (types, func) {
    if (!types) {
      if (func) {
        for (const type in this.#list) {
          removeAll(this.#list[type], func, (event) => {
            if (event) {
              this.#node?.removeEventListener(type, event)
            }
          })
        }
      } else {
        for (const type in this.#list) {
          for (const event of (this.#list[type] || [])) {
            this.#node?.removeEventListener(type, event)
          }
          delete this.#list[type]
        }
      }
    } else {
      const typeList = types.split(',').map(item => item.trim()).filter(item => !!item)
      if (func) {
        for (const type of typeList) {
          removeAll(this.#list[type], func, (event) => {
            if (event) {
              this.#node?.removeEventListener(type, event)
            }
          })
        }
      } else {
        for (const type of typeList) {
          for (const event of (this.#list[type] || [])) {
            this.#node?.removeEventListener(type, event)
          }
          delete this.#list[type]
        }
      }
    }
  }
}
