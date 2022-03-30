import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import './screenshot.scss'

export default class ScreenShot {
  static getImage ({ node, width, height, callback = () => {} }) {
    return new Promise((resolve, reject) => {
      if (!(node instanceof window.HTMLElement)) {
        reject(new Error('node must be HTMLElement'))
      }
      let scale
      if (width && height) {
        scale = Math.min(node.offsetWidth / width, node.offsetHeight / height)
      } else {
        scale = 1
      }
      const style = {
        transform: 'scale(' + scale + ')',
        transformOrigin: 'top left',
        width: node.offsetWidth + 'px',
        height: node.offsetHeight + 'px'
      }
      const param = {
        height: node.offsetHeight * scale,
        width: node.offsetWidth * scale,
        quality: 1,
        style
      }
      domToImage
        .toBlob(node, param)
        .then((val) => {
          callback(val)
          resolve(val)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  static getMergeImage ({ imgList = [], width, height, callback = () => {} }) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')

      let flag = 0
      imgList.forEach((item) => {
        if (item.img instanceof window.HTMLImageElement) {
          context.drawImage(item.img, 0, 0, item.width, item.height)
          flag++
        } else if (typeof item.img === 'string') {
          const img = new window.Image()
          img.src = item.img
          img.onload = () => {
            context.drawImage(
              img,
              item.x || 0,
              item.y || 0,
              item.width,
              item.height
            )
            flag++
            if (flag === imgList.length) {
              const data = canvas.toDataURL()
              callback(data)
              resolve(data)
            }
          }
          img.onerror = () => {
            flag++
            if (flag === imgList.length) {
              const data = canvas.toDataURL()
              callback(data)
              resolve(data)
            }
          }
        }
      })
      if (flag === imgList.length) {
        const data = canvas.toDataURL()
        callback(data)
        resolve(data)
      }
    })
  }

  constructor ({ node, img, destroyCallback = () => {} } = {}) {
    if (!(node instanceof window.HTMLElement)) {
      throw new Error('node must be HTMLElement')
    }
    if (node.__SCREEN_SHOT_GENERATED__) {
      throw new Error('node has been generated by ScreenShot')
    }

    this._destroyCallback = destroyCallback

    this._initDom({ node, img })
  }

  destroy () {
    _clearDom(this._node)
    delete this._node.__SCREEN_SHOT_GENERATED__
    delete this._node
    delete this._container
    delete this._originImg
    delete this._snipper
    delete this._resizer
    delete this._snipInfo
    delete this._drawer
    this._destroyCallback()
  }

  get node () {
    return this._node
  }

  get originImg () {
    return this._originImg
  }

  _initDom ({ node, img }) {
    this._initNode(node)
    this._initImage(img)
    this._initSnipper()
  }

  _initNode (node) {
    this._node = node
    this._node.__SCREEN_SHOT_GENERATED__ = true
    _clearDom(this._node)
    this._container = document.createElement('div')
    this._container.classList.add('screenshot')
    this._node.append(this._container)
  }

  _initImage (img) {
    if (img instanceof window.HTMLImageElement) {
      this._originImg = img
    } else if (typeof img === 'string') {
      this._originImg = new window.Image()
      this._originImg.src = img
    } else {
      return
    }
    this._originImg.classList.add('screenshot-image')
    this._container.append(this._originImg)
  }

  _initSnipper () {
    this._snipper = document.createElement('div')
    this._snipper.classList.add('screenshot-snipper')
    const nodeStyle = window.getComputedStyle(this._container)
    const snipperBorderWidth = Math.max(
      parseFloat(nodeStyle.width),
      parseFloat(nodeStyle.height)
    )
    this._snipper.style.borderWidth = snipperBorderWidth + 'px'
    this._snipper.style.transform = `matrix(1,0,0,1,${-snipperBorderWidth},${-snipperBorderWidth})`
    this._container.append(this._snipper)

    this._resizer = document.createElement('div')
    this._resizer.classList.add('screenshot-resizer')
    this._snipper.append(this._resizer)
    _addDragEvent({
      node: this._container,
      downCallback: () => {
        this._snipper.style.borderColor = 'rgba(0,0,0,0.6)'
        this._snipper.style.cursor = 'crosshair'
        this._snipInfo = {}
      },
      moveCallback: ({ endPosition, startPosition }) => {
        const snipperBorderWidth = parseFloat(this._snipper.style.borderWidth)
        const bounding = this._container.getBoundingClientRect()
        this._snipInfo = {
          width: Math.abs(endPosition.x - startPosition.x),
          height: Math.abs(endPosition.y - startPosition.y),
          left: Math.min(endPosition.x, startPosition.x) - bounding.x,
          top: Math.min(endPosition.y, startPosition.y) - bounding.y
        }
        this._snipper.style.width = this._snipInfo.width + 'px'
        this._snipper.style.height = this._snipInfo.height + 'px'
        this._snipper.style.transform = `matrix(1,0,0,1,${
          this._snipInfo.left - snipperBorderWidth
        },${this._snipInfo.top - snipperBorderWidth})`

        this._sizeinfo.style.display = 'block'
        this._updateSizeInfo()
      },
      upCallback: () => {
        this._snipper.style.cursor = 'default'
        this._initDrawer()
        this._initResizer()
        let originLeft, originTop
        this._resizerEvent = _addDragEvent({
          node: this._resizer,
          upNode: this._container,
          moveNode: this._container,
          last: true,
          downCallback: () => {
            this._destroyDrawer()
            this._destroyResizer()
            this._destroyToolbar()
            originLeft = this._snipInfo.left
            originTop = this._snipInfo.top
          },
          moveCallback: ({ endPosition, startPosition }) => {
            const snipperBorderWidth = parseFloat(this._snipper.style.borderWidth)
            const left = originLeft + endPosition.x - startPosition.x
            const top = originTop + endPosition.y - startPosition.y
            const containerStyle = window.getComputedStyle(this._container)
            const containerWidth = parseFloat(containerStyle.width)
            const containerHeight = parseFloat(containerStyle.height)
            this._snipInfo.left = left >= 0 ? (left + this._snipInfo.width <= containerWidth ? left : containerWidth - this._snipInfo.width) : 0
            this._snipInfo.top = top >= 0 ? (top + this._snipInfo.height <= containerHeight ? top : containerHeight - this._snipInfo.height) : 0
            this._snipper.style.transform = `matrix(1,0,0,1,${
              this._snipInfo.left - snipperBorderWidth
            },${this._snipInfo.top - snipperBorderWidth})`
            this._updateSizeInfo()
          },
          upCallback: () => {
            this._initDrawer()
            this._initResizer()
            this._initToolbar()
          }
        })
        this._initToolbar()
      }
    })

    this._sizeinfo = document.createElement('div')
    this._sizeinfo.classList.add('screenshot-sizeinfo')
    this._snipper.append(this._sizeinfo)
  }

  _updateSizeInfo () {
    if (this._snipInfo.top < 27) {
      this._sizeinfo.style.top = '5px'
    } else {
      this._sizeinfo.style.top = '-27px'
    }
    this._sizeinfo.innerText = `${this._snipInfo.width} * ${this._snipInfo.height}`
  }

  _initResizer () {
    this._destroyResizer()
    const wrapper = document.createElement('div')
    wrapper.classList.add('screenshot-resizer-wrapper')
    for (const direction of ['top', 'topright', 'right', 'bottomright', 'bottom', 'bottomleft', 'left', 'topleft']) {
      const resizer = document.createElement('div')
      resizer.classList.add('screenshot-resizer-item', `screenshot-resizer-${direction}`)
      let _snipInfo
      _addDragEvent({
        node: resizer,
        upNode: this._container,
        moveNode: this._container,
        last: true,
        downCallback: () => {
          this._destroyToolbar()
          this._destroyDrawer()
          _snipInfo = { ...this._snipInfo }
          this._resizer.style.cursor = window.getComputedStyle(resizer).cursor
        },
        moveCallback: ({ endPosition, startPosition }) => {
          const snipperBorderWidth = parseFloat(this._snipper.style.borderWidth)
          const x = endPosition.x - startPosition.x
          const y = endPosition.y - startPosition.y
          if (direction.includes('top')) {
            this._snipInfo.top = _snipInfo.top + y < _snipInfo.top + _snipInfo.height - 10 ? _snipInfo.top + y : _snipInfo.top + _snipInfo.height - 10
            this._snipInfo.height = _snipInfo.height - y > 10 ? _snipInfo.height - y : 10
          }
          if (direction.includes('right')) {
            this._snipInfo.width = _snipInfo.width + x > 10 ? _snipInfo.width + x : 10
          }
          if (direction.includes('bottom')) {
            this._snipInfo.height = _snipInfo.height + y > 10 ? _snipInfo.height + y : 10
          }
          if (direction.includes('left')) {
            this._snipInfo.left = _snipInfo.left + x < _snipInfo.left + _snipInfo.width - 10 ? _snipInfo.left + x : _snipInfo.left + _snipInfo.width - 10
            this._snipInfo.width = _snipInfo.width - x > 10 ? _snipInfo.width - x : 10
          }
          this._snipper.style.width = this._snipInfo.width + 'px'
          this._snipper.style.height = this._snipInfo.height + 'px'
          this._snipper.style.transform = `matrix(1,0,0,1,${
            this._snipInfo.left - snipperBorderWidth
          },${this._snipInfo.top - snipperBorderWidth})`
          this._updateSizeInfo()
        },
        upCallback: () => {
          this._initToolbar()
          this._initDrawer()
          this._resizer.style.cursor = 'move'
        }
      })
      wrapper.append(resizer)
    }
    this._resizer.append(wrapper)
  }

  _stopMove () {
    this._destroyResizer()
    if (this._resizerEvent) {
      this._resizerEvent.stop()
    }
    this._resizer.style.cursor = 'default'
  }

  _destroyResizer () {
    _clearDom(this._resizer)
  }

  _initToolbar () {
    this._destroyToolbar()
    this._toolbar = document.createElement('div')
    this._toolbar.classList.add('screenshot-toolbar')
    this._snipper.append(this._toolbar)
    // todo 绘制矩形
    // this._addTool({ name: '矩形', iconClass: 'icon-square' })
    // todo 绘制椭圆
    // this._addTool({ name: '椭圆', iconClass: 'icon-circle' })
    this._addTool({
      name: '画笔',
      iconClass: 'icon-write',
      click: () => {
        this._stopMove()
      }
    })
    this._addTool({
      name: '马赛克',
      iconClass: 'icon-mosaic',
      click: () => {
        this._stopMove()
      }
    })
    this._addTool({
      name: '文本',
      iconClass: 'icon-text',
      click: () => {
        this._stopMove()
      }
    })
    this._addToolDivider()
    this._addTool({ name: '撤销', iconClass: 'icon-return', disabled: true })
    this._addTool({
      name: '保存图片',
      iconClass: 'icon-download',
      click: () => {
        this._drawer.toBlob((blob) => {
          saveAs(blob, 'clip.png')
          this.destroy()
        })
      }
    })
    this._addTool({
      name: '退出',
      iconClass: 'icon-close',
      color: 'red',
      click: () => {
        this.destroy()
      }
    })
    this._addTool({
      name: '完成',
      iconClass: 'icon-check',
      color: 'green',
      click: () => {
        this._drawer.toBlob((blob) => {
          const data = [
            new window.ClipboardItem({
              [blob.type]: blob
            })
          ]
          navigator.clipboard.write(data).finally(() => {
            this.destroy()
          })
        })
      }
    })
    this._updateToolBar()
  }

  _updateToolBar () {
    if (this._snipInfo.top + this._snipInfo.height + 50 < this._container.offsetHeight) {
      this._toolbar.style.top = 'calc(100% + 8px)'
    } else {
      this._toolbar.style.top = 'calc(100% - 50px)'
    }
    if (this._snipInfo.left + this._snipInfo.width - this._toolbar.offsetWidth >= 0) {
      this._toolbar.style.left = 'unset'
      this._toolbar.style.right = '0'
    } else {
      this._toolbar.style.left = '0'
      this._toolbar.style.right = 'unset'
    }
  }

  _addTool ({ name = '', iconClass = '', color = 'white', click = () => {}, disabled = false } = {}) {
    const dom = document.createElement('div')
    dom.classList.add('screenshot-toolbar-tool')
    if (disabled) {
      dom.classList.add('disabled')
    }
    dom.style.color = color
    dom.setAttribute('title', name)
    dom.onclick = function () {
      if (!disabled) {
        click()
      }
    }

    const icon = document.createElement('span')
    icon.classList.add('icon', iconClass.trim())
    dom.append(icon)

    this._toolbar.append(dom)
  }

  _addToolDivider () {
    const dom = document.createElement('div')
    dom.classList.add('screenshot-toolbar-divider')
    this._toolbar.append(dom)
  }

  _destroyToolbar () {
    if (this._toolbar) {
      this._toolbar.remove()
      delete this._toolbar
    }
  }

  _initDrawer () {
    this._destroyDrawer()
    this._drawer = document.createElement('canvas')
    this._drawer.classList.add('screenshot-drawer')
    this._drawer.width = this._snipInfo.width
    this._drawer.height = this._snipInfo.height
    const context = this._drawer.getContext('2d')
    const widthScale = this._originImg.naturalWidth / this._originImg.width
    const heightScale = this._originImg.naturalHeight / this._originImg.height
    context.drawImage(this._originImg, this._snipInfo.left * widthScale, this._snipInfo.top * heightScale, this._snipInfo.width * widthScale, this._snipInfo.height * heightScale, 0, 0, this._snipInfo.width, this._snipInfo.height)
    this._snipper.append(this._drawer)
  }

  _destroyDrawer () {
    if (this._drawer) {
      this._drawer.remove()
      delete this._drawer
    }
  }
}

/**
 * 清空节点
 * @param {HTMLElement} node
 */
function _clearDom (node) {
  if (!(node instanceof window.HTMLElement)) {
    throw new Error('node must be HTMLElement')
  }
  while (node.firstChild) {
    node.removeChild(node.lastChild)
  }
}

function _addDragEvent ({ node, moveNode, upNode, moveCallback = () => {}, downCallback = () => {}, upCallback = () => {}, last = false } = {}) {
  if (!(node instanceof window.HTMLElement)) {
    throw new Error('node must be HTMLElement')
  }

  let startPosition
  upNode = upNode || node
  moveNode = moveNode || node

  node.addEventListener('click', () => {})
  node.addEventListener('mousedown', _handleMouseDown)
  upNode.addEventListener('mouseup', _handleMouseUp)
  let flag = true

  function _handleMouseDown (e) {
    e.stopPropagation()
    e.preventDefault()
    if (flag) {
      flag = false
      startPosition = {
        x: e.clientX,
        y: e.clientY
      }
      moveNode.addEventListener('mousemove', _handleMouseMove)
      downCallback({ startPosition })
    }
  }

  function _handleMouseMove (e) {
    e.stopPropagation()
    e.preventDefault()
    moveCallback({
      startPosition,
      endPosition: {
        x: e.clientX,
        y: e.clientY
      }
    })
  }

  function _handleMouseUp (e) {
    e.stopPropagation()
    e.preventDefault()
    if (!startPosition) {
      return
    }
    moveNode.removeEventListener('mousemove', _handleMouseMove)
    if (!last) {
      node.removeEventListener('mousedown', _handleMouseDown)
      upNode.removeEventListener('mouseup', _handleMouseUp)
    }
    upCallback({
      startPosition,
      endPosition: {
        x: e.clientX,
        y: e.clientY
      }
    })
    startPosition = null
    flag = true
  }

  function stop () {
    last = false
    moveNode.removeEventListener('mousemove', _handleMouseMove)
    if (!last) {
      node.removeEventListener('mousedown', _handleMouseDown)
      upNode.removeEventListener('mouseup', _handleMouseUp)
    }
    startPosition = null
  }

  return {
    stop
  }
}
