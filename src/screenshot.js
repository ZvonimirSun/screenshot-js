import { toBlob } from 'html-to-image'
import { saveAs } from 'file-saver'
import { changeDpiBlob } from './ChangeDpi.js'
import MosaicBrush from './MosaicBrush.js'
import ScreenshotFabricEvent from './screenshot-fabric-event.js'
import ScreenshotTool from './screenshot-tool'
import { fabric } from 'fabric'
import {
  clearNode,
  addDragEvent,
  dataURLToBlob,
  log,
  error
} from './utils.js'
import { clone, isNumber, merge } from 'lodash-es'
import './screenshot.scss'

const { Canvas, Textbox, PencilBrush, Rect, Ellipse, Path, Line, Group } = fabric

export default class Screenshot {
  /**
   * @param {HTMLElement} node 容器
   * @param {HTMLImageElement|string} img 底图
   * @param {function} [destroyCallback] destroy回调
   * @param {function} [readyCallback] ready回调
   * @param {number|undefined} [autoWelt] 自动贴边距离
   * @param {boolean|undefined} [autoFull] 自动截全屏
   * @param {string|undefined} [okColor] 确定按钮颜色
   * @param {string|undefined} [cancelColor] 取消按钮颜色
   * @param {string|undefined} [btnColor] 按钮颜色
   * @param {string|undefined} [btnSize] 按钮大小
   * @param {boolean|undefined} [saveBtn=true] 保存按钮
   */
  constructor ({
    node,
    img,
    destroyCallback = () => {},
    readyCallback = () => {},
    autoWelt,
    autoFull,
    okColor,
    cancelColor,
    btnColor,
    btnSize,
    saveBtn
  } = {}) {
    if (!(node instanceof window.HTMLElement)) {
      throw new Error('node must be HTMLElement')
    }
    if (node.__SCREEN_SHOT_GENERATED__) {
      throw new Error('node has been generated by Screenshot')
    }

    node.__SCREEN_SHOT_GENERATED__ = true

    this._child = {}
    this._events = {}
    this._infos = {
      status: 'pending'
    }

    this._tools = {}
    this._destroyed = false

    this._options = {
      autoWelt: 20,
      autoFull: false,
      okColor: undefined,
      cancelColor: undefined,
      btnColor: undefined,
      btnSize: undefined,
      saveBtn: true
    }

    merge(this._options, {
      autoWelt,
      autoFull,
      okColor,
      cancelColor,
      btnColor,
      btnSize,
      saveBtn
    })

    try {
      log('Screenshot 初始化开始')
      this._initNode({
        node,
        img
      })
      this._events.destroyCallback = destroyCallback
      this._events.readyCallback = readyCallback
      this._events.keyboardEvent = this._keyboardEvent.bind(this)
      document.addEventListener('keydown', this._events.keyboardEvent)
      if (this._originImg.complete) {
        this._status = 'ready'
      } else {
        this._status = 'waitForImg'
      }
    } catch (e) {
      this.destroy()
      error('Screenshot 初始化失败')
      throw e
    }
  }

  // region computed
  get options () {
    return this._options
  }

  get status () {
    return this._status
  }

  get _status () {
    return this._infos.status || 'pending'
  }

  set _status (val) {
    if (this.destroyed) {
      return
    }
    this._infos.status = val
    if (val === 'ready') {
      this._events.readyCallback && this._events.readyCallback()
      if (this._events.readyEvent && this._events.readyEvent.length) {
        for (const callback of this._events.readyEvent) {
          callback()
        }
      }
      this._events.readyEvent = []
      log('Screenshot 初始化完成')
    }
  }

  get destroyed () {
    return this._destroyed
  }

  get img () {
    if (this._canvas) {
      const img = new window.Image()
      img.src = this._canvas.toDataURL()
      return img
    } else if (this._originImg) {
      const canvas = document.createElement('canvas')
      canvas.width = this._originImg.width
      canvas.height = this._originImg.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(this._originImg, 0, 0, this._originImg.naturalWidth, this._originImg.naturalHeight, 0, 0, this._originImg.width, this._originImg.height)
      const img = new window.Image()
      img.src = canvas.toDataURL()
      return img
    } else {
      return null
    }
  }

  get canvas () {
    return this._canvas
  }

  get _snipInfo () {
    return this._infos.snipInfo || {}
  }

  set _snipInfo (val) {
    this._infos.snipInfo = merge(this._infos.snipInfo, val)
    val = this._infos.snipInfo
    const snipper = this._snipper
    const snipperBorderWidth = parseFloat(snipper.style.borderWidth)
    snipper.style.width = val.width + 'px'
    snipper.style.height = val.height + 'px'
    snipper.style.transform = `matrix(1,0,0,1,${
      val.left - snipperBorderWidth
    },${val.top - snipperBorderWidth})`

    const sizeinfo = this._sizeinfo
    sizeinfo.style.display = 'block'
    if (val.top < 27) {
      sizeinfo.style.top = '5px'
    } else {
      sizeinfo.style.top = '-27px'
    }
    sizeinfo.innerText = `${val.width} * ${val.height}`
  }

  get _node () {
    return this._child.node
  }

  set _node (val) {
    if (val) {
      this._child.node = val
    } else {
      delete this._child.node
    }
  }

  get _container () {
    return this._child.container
  }

  set _container (val) {
    if (this._child.container) {
      this._child.container.remove()
      delete this._child.container
    }
    if (val) {
      this._child.container = val
    }
  }

  get _originImg () {
    return this._child.originImg
  }

  set _originImg (val) {
    if (this._child.originImg) {
      this._child.originImg.remove()
      delete this._child.originImg
    }
    if (val) {
      this._child.originImg = val
    }
  }

  get _snipper () {
    return this._child.snipper
  }

  set _snipper (val) {
    if (this._child.snipper) {
      this._child.snipper.remove()
      delete this._child.snipper
    }
    if (val) {
      this._child.snipper = val
    }
  }

  get _resizer () {
    return this._child.resizer
  }

  set _resizer (val) {
    if (this._child.resizer) {
      this._child.resizer.remove()
      delete this._child.resizer
    }
    if (val) {
      this._child.resizer = val
    }
  }

  get _toolbar () {
    return this._child.toolbar
  }

  set _toolbar (val) {
    if (this._child.toolbar) {
      this._child.toolbar.remove()
      delete this._child.toolbar
    }
    if (val) {
      this._child.toolbar = val
    }
  }

  get _drawer () {
    return this._child.drawer
  }

  set _drawer (val) {
    if (this._child.drawer) {
      this._child.drawer.remove()
      delete this._child.drawer
    }
    if (val) {
      this._child.drawer = val
    }
  }

  get _sizeinfo () {
    return this._child.sizeinfo
  }

  set _sizeinfo (val) {
    if (this._child.sizeinfo) {
      this._child.sizeinfo.remove()
      delete this._child.sizeinfo
    }
    if (val) {
      this._child.sizeinfo = val
    }
  }

  get _canvas () {
    return this._infos.fabricDrawer || this._drawer
  }

  get _hasActiveTool () {
    let result = false
    for (const name in this._tools) {
      if (this._tools[name].active) {
        result = true
      }
    }
    return result
  }
  // endregion

  destroy (data) {
    if (this._destroyed) {
      return
    }
    clearNode(this._child.node)
    delete this._child.node.__SCREEN_SHOT_GENERATED__
    const destroyCallback = this._events.destroyCallback
    document.removeEventListener('keydown', this._events.keyboardEvent)
    this._child = {}
    this._events = {}
    this._infos = {}
    this._tools = {}
    this._destroyed = true
    destroyCallback && destroyCallback(data)
  }

  /**
   * 删除事件
   * @param e {KeyboardEvent} 鼠标事件
   * @private
   */
  _keyboardEvent (e) {
    if (e.repeat) {
      return
    }
    if (e.key === 'Escape') {
      this.destroy()
      return
    }
    if (e.key === 'Enter') {
      this._okFunc()
      return
    }
    if (this._infos.fabricDrawer && !this._hasActiveTool) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tmp = this._canvas.getActiveObject()
        if (tmp && tmp.isEditing) {
          return
        }
        const objects = tmp ? (tmp._objects ? tmp._objects : [tmp]) : null
        if (objects) {
          objects.forEach(object => {
            if (object.group) {
              this._canvas.remove(object.group)
              this._canvas.remove(object)
            } else {
              this._canvas.remove(object)
            }
          })
          this._canvas.discardActiveObject()
          this._canvas.requestRenderAll()
        }
      }
    }
  }

  // region 初始化
  _initNode ({ node, img }) {
    this._initContainer(node)
    this._initImage(img)
    this._initSnipper()
  }

  _initContainer (node) {
    this._node = node
    clearNode(node)
    const container = this._container = document.createElement('div')
    container.classList.add('screenshot')
    node.append(container)
    log('Screenshot 容器创建完成')
  }

  _initImage (img) {
    const originImg = new window.Image()
    originImg.setAttribute('crossOrigin', 'Anonymous')
    originImg.addEventListener('load', () => {
      if (this._status === 'waitForImg') {
        this._status = 'ready'
      }
    }, false)
    if (img instanceof window.HTMLImageElement) {
      originImg.src = img.src
    } else if (typeof img === 'string') {
      originImg.src = img
    } else {
      throw new Error('Screenshot 图片容器创建失败')
    }
    this._originImg = originImg
    originImg.classList.add('screenshot-image')
    this._container.append(originImg)
    this._container.style.width = `${originImg.width}px`
    this._container.style.height = `${originImg.height}px`
    log('Screenshot 图片容器创建完成')
  }

  _initSnipper () {
    const container = this._container
    const containerStyle = window.getComputedStyle(container)

    const snipper = this._snipper = document.createElement('div')
    snipper.classList.add('screenshot-snipper')
    const snipperBorderWidth = Math.max(
      parseFloat(containerStyle.width),
      parseFloat(containerStyle.height)
    )
    snipper.style.borderWidth = snipperBorderWidth + 'px'
    snipper.style.transform = `matrix(1,0,0,1,${-snipperBorderWidth},${-snipperBorderWidth})`
    container.append(snipper)

    const sizeinfo = this._sizeinfo = document.createElement('div')
    sizeinfo.classList.add('screenshot-sizeinfo')
    snipper.append(sizeinfo)

    const resizer = this._resizer = document.createElement('div')
    resizer.classList.add('screenshot-resizer')
    snipper.append(resizer)
    this._initSnipperEvent()
  }

  _initSnipperEvent () {
    const container = this._container
    const snipper = this._snipper
    if (!this._options.autoFull) {
      let moved = false
      addDragEvent({
        node: container,
        downCallback: () => {
          snipper.style.borderColor = 'rgba(0,0,0,0.6)'
        },
        moveCallback: ({ endPosition, startPosition }) => {
          moved = true
          const bounding = container.getBoundingClientRect()
          let data = {
            width: Math.abs(endPosition.x - startPosition.x),
            height: Math.abs(endPosition.y - startPosition.y),
            left: Math.min(endPosition.x, startPosition.x) - bounding.x,
            top: Math.min(endPosition.y, startPosition.y) - bounding.y
          }
          if (this._options.autoWelt) {
            data = this._autoWelt(data)
          }
          this._snipInfo = data
        },
        upCallback: () => {
          if (moved) {
            if (this._snipInfo.width >= 10 && this._snipInfo.height >= 10) {
              snipper.style.cursor = 'default'
              this._initResizerEvent()
            } else {
              this._snipFull()
            }
          } else {
            this._snipFull()
          }
        }
      })
    } else {
      this._snipFull()
    }
  }

  _snipFull () {
    const container = this._container
    const snipper = this._snipper
    const style = window.getComputedStyle(container)
    this._snipInfo = {
      width: parseFloat(style.width),
      height: parseFloat(style.height),
      left: 0,
      top: 0
    }
    snipper.style.borderColor = 'rgba(0,0,0,0.6)'
    snipper.style.cursor = 'default'
    this._initResizerEvent()
  }

  _autoWelt (snipInfo) {
    if (!this._options.autoWelt) {
      return snipInfo
    }
    const style = window.getComputedStyle(this._container)
    const data = clone(snipInfo)
    let distance = 20
    if (isNumber(this._options.autoWelt)) {
      distance = this._options.autoWelt
    }
    if (data.left < distance) {
      data.width = data.width + data.left
      data.left = 0
    }
    if (data.left + data.width + distance > parseFloat(style.width)) {
      data.width = parseFloat(style.width) - data.left
    }
    if (data.top < distance) {
      data.height = data.height + data.top
      data.top = 0
    }
    if (data.top + data.height + distance > parseFloat(style.height)) {
      data.height = parseFloat(style.height) - data.top
    }
    return data
  }
  // endregion

  // region resizer
  _initResizer () {
    this._destroyResizer()
    const wrapper = document.createElement('div')
    wrapper.classList.add('screenshot-resizer-wrapper')
    const container = this._container
    const resizer = this._resizer
    this._events.resizerItemEvents = []
    for (const direction of ['top', 'topright', 'right', 'bottomright', 'bottom', 'bottomleft', 'left', 'topleft']) {
      const resizerItem = document.createElement('div')
      resizerItem.classList.add('screenshot-resizer-item', `screenshot-resizer-${direction}`)
      let _snipInfo
      this._events.resizerItemEvents.push(addDragEvent({
        node: resizerItem,
        upNode: container,
        moveNode: container,
        last: true,
        downCallback: () => {
          this._toolbar = null
          this._drawer = null
          _snipInfo = { ...this._snipInfo }
          resizer.style.cursor = window.getComputedStyle(resizerItem).cursor
        },
        moveCallback: ({ endPosition, startPosition }) => {
          const x = endPosition.x - startPosition.x
          const y = endPosition.y - startPosition.y
          const style = window.getComputedStyle(container)
          let tmpSnipInfo = { ..._snipInfo }
          if (direction.includes('top')) {
            tmpSnipInfo.top = _snipInfo.top + y < _snipInfo.top + _snipInfo.height - 10 ? (_snipInfo.top + y >= 0 ? _snipInfo.top + y : 0) : _snipInfo.top + _snipInfo.height - 10
            tmpSnipInfo.height = _snipInfo.height - y > 10 ? (_snipInfo.top + y >= 0 ? _snipInfo.height - y : _snipInfo.height + _snipInfo.top) : 10
          }
          if (direction.includes('right')) {
            tmpSnipInfo.width = _snipInfo.width + x > 10 ? (_snipInfo.left + _snipInfo.width + x <= parseFloat(style.width) ? _snipInfo.width + x : parseFloat(style.width) - _snipInfo.left) : 10
          }
          if (direction.includes('bottom')) {
            tmpSnipInfo.height = _snipInfo.height + y > 10 ? (_snipInfo.top + _snipInfo.height + y <= parseFloat(style.height) ? _snipInfo.height + y : parseFloat(style.height) - _snipInfo.top) : 10
          }
          if (direction.includes('left')) {
            tmpSnipInfo.left = _snipInfo.left + x < _snipInfo.left + _snipInfo.width - 10 ? (_snipInfo.left + x >= 0 ? _snipInfo.left + x : 0) : _snipInfo.left + _snipInfo.width - 10
            tmpSnipInfo.width = _snipInfo.width - x > 10 ? (_snipInfo.left + x >= 0 ? _snipInfo.width - x : _snipInfo.width + _snipInfo.left) : 10
          }
          if (this._options.autoWelt) {
            tmpSnipInfo = this._autoWelt(tmpSnipInfo)
          }
          this._snipInfo = tmpSnipInfo
        },
        upCallback: () => {
          this._waitForReady(() => {
            this._initDrawer()
            this._initToolbar()
          })
          resizer.style.cursor = 'move'
        }
      }))
      wrapper.append(resizerItem)
    }
    resizer.append(wrapper)
  }

  _initResizerEvent () {
    const container = this._container
    const resizer = this._resizer
    this._initResizer()
    this._waitForReady(() => {
      this._initDrawer()
      this._initToolbar()
    })
    let originLeft, originTop
    this._events.resizerEvent = addDragEvent({
      node: resizer,
      upNode: container,
      moveNode: container,
      last: true,
      downCallback: () => {
        this._drawer = null
        this._destroyResizer()
        this._toolbar = null
        originLeft = this._snipInfo.left
        originTop = this._snipInfo.top
      },
      moveCallback: ({ endPosition, startPosition }) => {
        const left = originLeft + endPosition.x - startPosition.x
        const top = originTop + endPosition.y - startPosition.y
        const containerStyle = window.getComputedStyle(container)
        const containerWidth = parseFloat(containerStyle.width)
        const containerHeight = parseFloat(containerStyle.height)
        this._snipInfo = {
          ...this._snipInfo,
          left: left >= 0 ? (left + this._snipInfo.width <= containerWidth ? left : containerWidth - this._snipInfo.width) : 0,
          top: top >= 0 ? (top + this._snipInfo.height <= containerHeight ? top : containerHeight - this._snipInfo.height) : 0
        }
      },
      upCallback: () => {
        this._initResizer()
        this._waitForReady(() => {
          this._initDrawer()
          this._initToolbar()
        })
      }
    })
  }

  _destroyResizer () {
    if (this._events.resizerItemEvents) {
      for (const event of this._events.resizerItemEvents) {
        event.stop()
      }
    }
    delete this._events.resizerItemEvents
    clearNode(this._resizer)
  }

  _stopResize () {
    this._destroyResizer()
    if (this._events.resizerEvent) {
      this._events.resizerEvent.stop()
      delete this._events.resizerEvent
    }
    this._resizer.remove()
  }
  // endregion

  _waitForReady (func, type = 'replace') {
    if (this._status === 'ready') {
      func()
    } else {
      this._events.readyEvent = this._events.readyEvent || []
      switch (type) {
        case 'replace': {
          this._events.readyEvent = [func]
          break
        }
        case 'add': {
          this._events.readyEvent.push(func)
          break
        }
        case 'clear': {
          this._events.readyEvent = []
          break
        }
      }
    }
  }

  // region drawer
  _initDrawer () {
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

  _initDrawEvent () {
    this._stopResize()
    const data = this.img
    if (!this._infos.fabricDrawer) {
      this._infos.fabricDrawer = new Canvas(this._drawer)
      this._canvas.setBackgroundImage(
        data.src,
        undefined,
        {
          erasable: false
        }
      )
      this._events.drawEvent = new ScreenshotFabricEvent(this._canvas)
      this._events.drawEvent.add('object:added', ({ target }) => {
        target.setControlsVisibility({
          tl: false,
          tr: false,
          br: false,
          bl: false,
          ml: false,
          mt: false,
          mr: false,
          mb: false,
          mtr: false
        })
      })
    }
  }

  // endregion

  // region toolbar
  _initToolbar () {
    this._toolbar = document.createElement('div')
    this._toolbar.classList.add('screenshot-toolbar')
    if (this._options.btnSize) {
      this._toolbar.style.fontSize = this._options.btnSize
    }
    this._snipper.append(this._toolbar)
    // 绘制矩形
    this._addToolSquare()
    // 绘制椭圆
    this._addToolEllipse()
    this._addToolArrow()
    this._addToolWrite()
    this._addToolMosaic()
    this._addToolText()
    this._addToolDivider()
    // todo 撤销修改
    // this._addTool({ name: '撤销', icon: 'return', disabled: true })
    if (this._options.saveBtn) {
      this._addTool({
        name: '保存图片',
        icon: 'download',
        clickEvent: () => {
          dataURLToBlob(this._canvas.toDataURL()).then((blob) => {
            saveAs(blob, 'clip.png')
            this.destroy()
          })
        }
      })
    }
    this._addTool({
      name: '退出',
      icon: 'close',
      color: this._options.cancelColor || 'red',
      clickEvent: () => {
        this.destroy()
      }
    })
    this._addTool({
      name: '完成',
      icon: 'check',
      color: this._options.okColor || 'green',
      clickEvent: () => {
        this._okFunc()
      }
    })
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

  _okFunc () {
    dataURLToBlob(this._canvas.toDataURL()).then((blob) => {
      try {
        const data = [
          new window.ClipboardItem({
            [blob.type]: blob
          })
        ]
        navigator.clipboard.write(data).finally(() => {
          this.destroy(blob)
        })
      } catch (e) {
        error(e.name, e.message)
        saveAs(blob, (new Date()).getTime() + '.png')
        this.destroy()
      }
    })
  }

  _addTool ({ name = '', icon = '', color = this._options.btnColor || 'white', disabled = false, clickEvent, activeEvent, pauseEvent } = {}) {
    this._tools[name] = new ScreenshotTool({
      name,
      icon,
      color,
      disabled,
      clickEvent: clickEvent
        ? () => {
            if (!this._tools[name].disabled) {
              clickEvent()
            }
          }
        : () => {
            this._initDrawEvent()
            this._switchActiveTool(this._tools[name])
          },
      activeEvent,
      pauseEvent
    })
    this._toolbar.append(this._tools[name].node)
    return this._tools[name]
  }

  _addToolDivider () {
    const dom = document.createElement('div')
    dom.classList.add('screenshot-toolbar-divider')
    this._toolbar.append(dom)
  }

  _addToolSquare () {
    let squareObject = null
    let mouseDown = false
    let mouseFrom = null
    let mouseTo = null
    let tool = null

    const downEvent = ({ e }) => {
      if (mouseDown) {
        return
      }
      mouseFrom = this._canvas.getPointer(e)
      squareObject = null
      mouseDown = true
    }
    const moveEvent = ({ e }) => {
      if (!mouseDown) {
        return
      }
      mouseTo = this._canvas.getPointer(e)
      if (squareObject) {
        this._canvas.remove(squareObject)
      }
      squareObject = new Rect({
        left: Math.min(mouseFrom.x, mouseTo.x),
        top: Math.min(mouseFrom.y, mouseTo.y),
        width: Math.abs(mouseFrom.x - mouseTo.x),
        height: Math.abs(mouseFrom.y - mouseTo.y),
        fill: 'transparent',
        stroke: 'red',
        strokeWidth: 3,
        noScaleCache: false
      })
      this._canvas.add(squareObject)
    }
    const upEvent = () => {
      mouseDown = false
      mouseFrom = null
      mouseTo = null
      if (squareObject) {
        squareObject.setControlsVisibility({
          tl: true,
          tr: true,
          br: true,
          bl: true,
          ml: true,
          mt: true,
          mr: true,
          mb: true,
          mtr: false
        })
        squareObject.on('scaling', (ev) => {
          const target = ev.transform.target
          const width = target.get('width') * target.get('scaleX')
          const height = target.get('height') * target.get('scaleY')
          target.set('width', width)
          target.set('height', height)
          target.set('scaleX', 1)
          target.set('scaleY', 1)
          this._canvas.requestRenderAll()
        })
      }
      squareObject = null
      this._switchActiveTool(tool)
    }

    tool = this._addTool({
      name: '矩形',
      icon: 'square',
      activeEvent: () => {
        this._events.drawEvent.add('mouse:down', downEvent)
        this._events.drawEvent.add('mouse:move', moveEvent)
        this._events.drawEvent.add('mouse:up', upEvent)
        this._canvas.selection = false
      },
      pauseEvent: () => {
        this._events.drawEvent.remove('mouse:down', downEvent)
        this._events.drawEvent.remove('mouse:move', moveEvent)
        this._events.drawEvent.remove('mouse:up', upEvent)
        this._canvas.selection = true
      }
    })
  }

  _addToolEllipse () {
    let ellipseObject = null
    let mouseDown = false
    let mouseFrom = null
    let mouseTo = null
    let tool = null

    const downEvent = ({ e }) => {
      if (mouseDown) {
        return
      }
      mouseFrom = this._canvas.getPointer(e)
      ellipseObject = null
      mouseDown = true
    }
    const moveEvent = ({ e }) => {
      if (!mouseDown) {
        return
      }
      mouseTo = this._canvas.getPointer(e)
      if (ellipseObject) {
        this._canvas.remove(ellipseObject)
      }
      ellipseObject = new Ellipse({
        left: Math.min(mouseFrom.x, mouseTo.x),
        top: Math.min(mouseFrom.y, mouseTo.y),
        rx: Math.abs(mouseFrom.x - mouseTo.x) / 2,
        ry: Math.abs(mouseFrom.y - mouseTo.y) / 2,
        fill: 'transparent',
        stroke: 'red',
        strokeWidth: 3,
        noScaleCache: false
      })
      this._canvas.add(ellipseObject)
    }
    const upEvent = () => {
      mouseDown = false
      mouseFrom = null
      mouseTo = null
      if (ellipseObject) {
        ellipseObject.setControlsVisibility({
          tl: true,
          tr: true,
          br: true,
          bl: true,
          ml: true,
          mt: true,
          mr: true,
          mb: true,
          mtr: false
        })
        ellipseObject.on('scaling', (ev) => {
          const target = ev.transform.target
          const rx = target.get('rx') * target.get('scaleX')
          const ry = target.get('ry') * target.get('scaleY')
          target.set('rx', rx)
          target.set('ry', ry)
          target.set('scaleX', 1)
          target.set('scaleY', 1)
          this._canvas.requestRenderAll()
        })
      }
      ellipseObject = null
      this._switchActiveTool(tool)
    }

    tool = this._addTool({
      name: '椭圆',
      icon: 'circle',
      activeEvent: () => {
        this._events.drawEvent.add('mouse:down', downEvent)
        this._events.drawEvent.add('mouse:move', moveEvent)
        this._events.drawEvent.add('mouse:up', upEvent)
        this._canvas.selection = false
      },
      pauseEvent: () => {
        this._events.drawEvent.remove('mouse:down', downEvent)
        this._events.drawEvent.remove('mouse:move', moveEvent)
        this._events.drawEvent.remove('mouse:up', upEvent)
        this._canvas.selection = true
      }
    })
  }

  _addToolArrow () {
    let arrowHeadObject = null
    let arrowLineObject = null
    let arrowObject = null
    let mouseDown = false
    let mouseFrom = null
    let mouseTo = null
    let tool = null

    const strokeWidth = 3

    const downEvent = ({ e }) => {
      if (mouseDown) {
        return
      }
      mouseFrom = this._canvas.getPointer(e)

      arrowLineObject = new Line([0, 0, 0, 0], {
        top: 0,
        left: 0,
        stroke: 'red',
        strokeWidth,
        objectCaching: false,
        originX: 'left',
        originY: 'center'
      })

      arrowHeadObject = new Path('M 0 0 L 20 10 L 0 20 z', {
        left: -20,
        top: 0,
        fill: 'red',
        stroke: '',
        strokeWidth: 0,
        objectCaching: false,
        originX: 'left',
        originY: 'center'
      })

      arrowObject = new Group([arrowLineObject, arrowHeadObject], {
        left: mouseFrom.x,
        top: mouseFrom.y,
        objectCaching: false,
        originX: 'left',
        originY: 'center',
        lockScalingY: true,
        lockScalingFlip: true
      })
      this._canvas.add(arrowObject)
      mouseDown = true
    }
    const moveEvent = ({ e }) => {
      if (!mouseDown) {
        return
      }
      mouseTo = this._canvas.getPointer(e)
      if (arrowObject) {
        this._canvas.remove(arrowObject)
      }

      const width = Math.sqrt(Math.pow(mouseTo.x - mouseFrom.x, 2) + Math.pow(mouseTo.y - mouseFrom.y, 2))
      const angle = Math.atan2(mouseTo.y - mouseFrom.y, mouseTo.x - mouseFrom.x) * 180 / Math.PI

      arrowLineObject.set({
        x2: width > 20 ? width - 20 : 0,
        originX: 'left',
        originY: 'center'
      })
      arrowLineObject.setCoords()
      arrowHeadObject.set({
        left: width - 20,
        originX: 'left',
        originY: 'center'
      })
      arrowHeadObject.setCoords()
      arrowObject = new Group([arrowLineObject, arrowHeadObject], {
        left: mouseFrom.x,
        top: mouseFrom.y,
        objectCaching: false,
        angle,
        originX: 'left',
        originY: 'center',
        lockScalingY: true,
        lockScalingFlip: true
      })
      this._canvas.add(arrowObject)
      this._canvas.requestRenderAll()
    }
    const upEvent = () => {
      mouseDown = false
      if (arrowObject) {
        arrowObject.setControlsVisibility({
          tl: false,
          tr: false,
          br: false,
          bl: false,
          ml: false,
          mt: false,
          mr: true,
          mb: false,
          mtr: false
        })
        arrowObject.on('scaling', (e) => {
          const object = e.transform.target
          const originPointer = { x: object.left, y: object.top }
          const pointer = this._canvas.getPointer(e)
          const width = Math.sqrt(Math.pow(pointer.x - originPointer.x, 2) + Math.pow(pointer.y - originPointer.y, 2))
          const angle = Math.atan2(pointer.y - originPointer.y, pointer.x - originPointer.x) * 180 / Math.PI
          object._objects[0].set({
            x1: -width / 2,
            x2: width / 2 - 20,
            y1: 0,
            y2: 0,
            scaleX: 1,
            scaleY: 1,
            originX: 'left',
            originY: 'center'
          })
          object._objects[0].setCoords()
          object._objects[1].set({
            left: width / 2 - 20,
            top: 0,
            scaleX: 1,
            scaleY: 1,
            originX: 'left',
            originY: 'center'
          })
          object._objects[1].setCoords()
          object.set({
            left: originPointer.x,
            top: originPointer.y,
            angle,
            width,
            scaleX: 1,
            scaleY: 1,
            originX: 'left',
            originY: 'center'
          })
          this._canvas.requestRenderAll()
        })
      }
      arrowObject = null
      this._switchActiveTool(tool)
    }

    tool = this._addTool({
      name: '箭头',
      icon: 'arrow-right-up',
      activeEvent: () => {
        this._events.drawEvent.add('mouse:down', downEvent)
        this._events.drawEvent.add('mouse:move', moveEvent)
        this._events.drawEvent.add('mouse:up', upEvent)
        this._canvas.selection = false
      },
      pauseEvent: () => {
        this._events.drawEvent.remove('mouse:down', downEvent)
        this._events.drawEvent.remove('mouse:move', moveEvent)
        this._events.drawEvent.remove('mouse:up', upEvent)
        this._canvas.selection = true
      }
    })
  }

  _addToolWrite () {
    this._addTool({
      name: '画笔',
      icon: 'write',
      activeEvent: () => {
        this._canvas.freeDrawingBrush = new PencilBrush(this._canvas)
        // 设置画笔颜色
        this._canvas.freeDrawingBrush.color = 'red'
        // 设置画笔粗细
        this._canvas.freeDrawingBrush.width = 5
        this._canvas.isDrawingMode = true
        this._canvas.selection = false
      },
      pauseEvent: () => {
        this._canvas.isDrawingMode = false
        this._canvas.selection = true
      }
    })
  }

  _addToolMosaic () {
    this._addTool({
      name: '马赛克',
      icon: 'mosaic',
      activeEvent: () => {
        this._canvas.selection = false
        this._canvas.isDrawingMode = true
        const brush = this._canvas.freeDrawingBrush = new MosaicBrush(this._canvas)
        brush.color = 'white'
        brush.width = 12
      },
      pauseEvent: () => {
        this._canvas.isDrawingMode = false
        this._canvas.selection = true
      }
    })
  }

  _addToolText () {
    let tool = null
    const createTextbox = (e) => {
      const textbox = new Textbox('文本', {
        fill: 'red',
        width: 100,
        left: e.pointer.x,
        top: e.pointer.y,
        fontSize: 18,
        lineHeight: 1,
        lockRotation: true,
        lockScalingY: true,
        lockScalingFlip: true,
        splitByGrapheme: true,
        objectCaching: false
      })
      textbox.on('scaling', (ev) => {
        const target = ev.transform.target
        const width = target.get('width') * target.get('scaleX')
        target.set('width', width)
        target.set('scaleX', 1)
      })
      this._switchActiveTool(tool)
      this._canvas.add(textbox)
      textbox.setControlsVisibility({
        tl: false,
        tr: false,
        br: false,
        bl: false,
        ml: true,
        mt: false,
        mr: true,
        mb: false,
        mtr: false
      })
      this._canvas.setActiveObject(textbox)
      this._canvas.requestRenderAll()
      textbox.enterEditing()
    }
    tool = this._addTool({
      name: '文本',
      icon: 'text',
      activeEvent: () => {
        this._canvas.defaultCursor = 'text'
        this._canvas.selection = false
        this._events.drawEvent.add('mouse:down', createTextbox)
      },
      pauseEvent: () => {
        this._canvas.defaultCursor = 'default'
        this._canvas.selection = true
        this._events.drawEvent.remove('mouse:down', createTextbox)
      }
    })
  }

  _switchActiveTool (tool) {
    if (!tool.active) {
      for (const name in this._tools) {
        if (name !== tool.name) {
          this._tools[name].active = false
        }
      }
    }
    tool.active = !tool.active
  }
  // endregion

  // region static functions
  static getImage ({ node, width, height, callback = () => {}, options = {}, dpi = 300 }) {
    return new Promise((resolve, reject) => {
      if (!(node instanceof window.HTMLElement)) {
        reject(new Error('node must be HTMLElement'))
      }

      let scale = (1 / window.devicePixelRatio) || 1

      if (width && height) {
        scale = Math.max(width / node.offsetWidth, height / node.offsetHeight)
      }

      const param = {
        height: node.offsetHeight * scale,
        width: node.offsetWidth * scale,
        quality: 1,
        cacheBust: true,
        includeQueryParams: true,
        ...options
      }
      toBlob(node, param)
        .then((val) => {
          if (dpi) {
            changeDpiBlob(val, dpi).then((blob) => {
              callback(blob)
              resolve(blob)
            }).catch((err) => {
              reject(err)
            })
            return
          }
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
  // endregion
}
