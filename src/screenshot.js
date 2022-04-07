import domToImage from 'dom-to-image'
import { saveAs } from 'file-saver'
import MosaicBrush from './MosaicBrush.js'
import ScreenshotFabricEvent from './screenshot-fabric-event.js'
import ScreenshotTool from './screenshot-tool'
import { fabric } from 'fabric'
import {
  clearNode,
  addDragEvent,
  dataURLToBlob,
  log
} from './utils.js'
import './screenshot.scss'

const { Canvas, Textbox, PencilBrush } = fabric

export default class Screenshot {
  static getImage ({ node, width, height, callback = () => {}, options = {} }) {
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
        style,
        cacheBust: true,
        ...options
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

  #child = {}
  #events = {}
  #infos = {}
  #tools = {}
  #ready = false
  #destroyed = false

  constructor ({ node, img, destroyCallback = () => {} } = {}) {
    if (!(node instanceof window.HTMLElement)) {
      throw new Error('node must be HTMLElement')
    }
    if (node.__SCREEN_SHOT_GENERATED__) {
      throw new Error('node has been generated by Screenshot')
    }

    node.__SCREEN_SHOT_GENERATED__ = true

    try {
      log('Screenshot 初始化开始')
      this.#initNode({
        node,
        img
      })
      this.#events.destroyCallback = destroyCallback
      this.#events.keyboardEvent = this.#keyboardEvent.bind(this)
      document.addEventListener('keydown', this.#events.keyboardEvent)
      this.#ready = true
      log('Screenshot 初始化完成')
    } catch (e) {
      this.destroy()
      log('Screenshot 初始化失败')
      throw e
    }
  }

  // region computed
  get ready () {
    return this.#ready
  }

  get destroyed () {
    return this.#destroyed
  }

  get img () {
    if (this.#canvas) {
      const img = new window.Image()
      img.src = this.#canvas.toDataURL()
      return img
    } else if (this.#originImg) {
      const canvas = document.createElement('canvas')
      canvas.width = this.#originImg.width
      canvas.height = this.#originImg.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(this.#originImg, 0, 0, this.#originImg.naturalWidth, this.#originImg.naturalHeight, 0, 0, this.#originImg.width, this.#originImg.height)
      const img = new window.Image()
      img.src = canvas.toDataURL()
      return img
    } else {
      return null
    }
  }

  get canvas () {
    return this.#canvas
  }

  get #snipInfo () {
    return this.#infos.snipInfo || {}
  }

  set #snipInfo (val) {
    this.#infos.snipInfo = val
    const snipper = this.#snipper
    const snipperBorderWidth = parseFloat(snipper.style.borderWidth)
    snipper.style.width = val.width + 'px'
    snipper.style.height = val.height + 'px'
    snipper.style.transform = `matrix(1,0,0,1,${
      val.left - snipperBorderWidth
    },${val.top - snipperBorderWidth})`

    const sizeinfo = this.#sizeinfo
    sizeinfo.style.display = 'block'
    if (val.top < 27) {
      sizeinfo.style.top = '5px'
    } else {
      sizeinfo.style.top = '-27px'
    }
    sizeinfo.innerText = `${val.width} * ${val.height}`
  }

  get #node () {
    return this.#child.node
  }

  set #node (val) {
    if (val) {
      this.#child.node = val
    } else {
      delete this.#child.node
    }
  }

  get #container () {
    return this.#child.container
  }

  set #container (val) {
    if (this.#child.container) {
      this.#child.container.remove()
      delete this.#child.container
    }
    if (val) {
      this.#child.container = val
    }
  }

  get #originImg () {
    return this.#child.originImg
  }

  set #originImg (val) {
    if (this.#child.originImg) {
      this.#child.originImg.remove()
      delete this.#child.originImg
    }
    if (val) {
      this.#child.originImg = val
    }
  }

  get #snipper () {
    return this.#child.snipper
  }

  set #snipper (val) {
    if (this.#child.snipper) {
      this.#child.snipper.remove()
      delete this.#child.snipper
    }
    if (val) {
      this.#child.snipper = val
    }
  }

  get #resizer () {
    return this.#child.resizer
  }

  set #resizer (val) {
    if (this.#child.resizer) {
      this.#child.resizer.remove()
      delete this.#child.resizer
    }
    if (val) {
      this.#child.resizer = val
    }
  }

  get #toolbar () {
    return this.#child.toolbar
  }

  set #toolbar (val) {
    if (this.#child.toolbar) {
      this.#child.toolbar.remove()
      delete this.#child.toolbar
    }
    if (val) {
      this.#child.toolbar = val
    }
  }

  get #drawer () {
    return this.#child.drawer
  }

  set #drawer (val) {
    if (this.#child.drawer) {
      this.#child.drawer.remove()
      delete this.#child.drawer
    }
    if (val) {
      this.#child.drawer = val
    }
  }

  get #sizeinfo () {
    return this.#child.sizeinfo
  }

  set #sizeinfo (val) {
    if (this.#child.sizeinfo) {
      this.#child.sizeinfo.remove()
      delete this.#child.sizeinfo
    }
    if (val) {
      this.#child.sizeinfo = val
    }
  }

  get #canvas () {
    return this.#infos.fabricDrawer || this.#drawer
  }

  get #hasActiveTool () {
    let result = false
    for (const name in this.#tools) {
      if (this.#tools[name].active) {
        result = true
      }
    }
    return result
  }
  // endregion

  destroy () {
    if (this.#destroyed) {
      return
    }
    clearNode(this.#child.node)
    delete this.#child.node.__SCREEN_SHOT_GENERATED__
    const destroyCallback = this.#events.destroyCallback
    document.removeEventListener('keydown', this.#events.keyboardEvent)
    this.#child = {}
    this.#events = {}
    this.#infos = {}
    this.#tools = {}
    this.#destroyed = true
    destroyCallback && destroyCallback()
  }

  /**
   * 删除事件
   * @param e {KeyboardEvent} 鼠标事件
   * @private
   */
  #keyboardEvent (e) {
    if (e.repeat) {
      return
    }
    if (e.key === 'Escape') {
      this.destroy()
      return
    }
    if (this.#infos.fabricDrawer && !this.#hasActiveTool) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tmp = this.#canvas.getActiveObject()
        if (tmp && tmp.isEditing) {
          return
        }
        const objects = tmp ? (tmp._objects ? tmp._objects : [tmp]) : []
        objects.forEach(object => {
          this.#canvas.remove(object)
        })
        this.#canvas.discardActiveObject()?.renderAll()
      }
    }
  }

  // region 初始化
  #initNode ({ node, img }) {
    this.#initContainer(node)
    this.#initImage(img)
    this.#initSnipper()
  }

  #initContainer (node) {
    this.#node = node
    clearNode(node)
    const container = this.#container = document.createElement('div')
    container.classList.add('screenshot')
    node.append(container)
    log('Screenshot 容器创建完成')
  }

  #initImage (img) {
    const originImg = new window.Image()
    originImg.setAttribute('crossOrigin', 'Anonymous')
    if (img instanceof window.HTMLImageElement) {
      originImg.src = img.src
    } else if (typeof img === 'string') {
      originImg.src = img
    } else {
      throw new Error('Screenshot 图片容器创建失败')
    }
    this.#originImg = originImg
    originImg.classList.add('screenshot-image')
    this.#container.append(originImg)
    this.#container.style.width = `${originImg.width}px`
    this.#container.style.height = `${originImg.height}px`
    log('Screenshot 图片容器创建完成')
  }

  #initSnipper () {
    const container = this.#container
    const containerStyle = window.getComputedStyle(container)

    const snipper = this.#snipper = document.createElement('div')
    snipper.classList.add('screenshot-snipper')
    const snipperBorderWidth = Math.max(
      parseFloat(containerStyle.width),
      parseFloat(containerStyle.height)
    )
    snipper.style.borderWidth = snipperBorderWidth + 'px'
    snipper.style.transform = `matrix(1,0,0,1,${-snipperBorderWidth},${-snipperBorderWidth})`
    container.append(snipper)

    const sizeinfo = this.#sizeinfo = document.createElement('div')
    sizeinfo.classList.add('screenshot-sizeinfo')
    snipper.append(sizeinfo)

    const resizer = this.#resizer = document.createElement('div')
    resizer.classList.add('screenshot-resizer')
    snipper.append(resizer)
    this.#initSnipperEvent()
  }

  #initSnipperEvent () {
    const container = this.#container
    const snipper = this.#snipper
    const resizer = this.#resizer
    let moved = false
    addDragEvent({
      node: container,
      downCallback: () => {
        snipper.style.borderColor = 'rgba(0,0,0,0.6)'
      },
      moveCallback: ({ endPosition, startPosition }) => {
        moved = true
        const bounding = container.getBoundingClientRect()
        this.#snipInfo = {
          width: Math.abs(endPosition.x - startPosition.x),
          height: Math.abs(endPosition.y - startPosition.y),
          left: Math.min(endPosition.x, startPosition.x) - bounding.x,
          top: Math.min(endPosition.y, startPosition.y) - bounding.y
        }
      },
      upCallback: () => {
        if (moved) {
          snipper.style.cursor = 'default'
          this.#initResizer()
          this.#initDrawer()
          this.#initToolbar()
          let originLeft, originTop
          this.#events.resizerEvent = addDragEvent({
            node: resizer,
            upNode: container,
            moveNode: container,
            last: true,
            downCallback: () => {
              this.#drawer = null
              this.#destroyResizer()
              this.#toolbar = null
              originLeft = this.#snipInfo.left
              originTop = this.#snipInfo.top
            },
            moveCallback: ({ endPosition, startPosition }) => {
              const left = originLeft + endPosition.x - startPosition.x
              const top = originTop + endPosition.y - startPosition.y
              const containerStyle = window.getComputedStyle(container)
              const containerWidth = parseFloat(containerStyle.width)
              const containerHeight = parseFloat(containerStyle.height)
              this.#snipInfo = {
                ...this.#snipInfo,
                left: left >= 0 ? (left + this.#snipInfo.width <= containerWidth ? left : containerWidth - this.#snipInfo.width) : 0,
                top: top >= 0 ? (top + this.#snipInfo.height <= containerHeight ? top : containerHeight - this.#snipInfo.height) : 0
              }
            },
            upCallback: () => {
              this.#initResizer()
              this.#initDrawer()
              this.#initToolbar()
            }
          })
        } else {
          this.#initSnipperEvent()
        }
      }
    })
  }
  // endregion

  // region resizer
  #initResizer () {
    this.#destroyResizer()
    const wrapper = document.createElement('div')
    wrapper.classList.add('screenshot-resizer-wrapper')
    const container = this.#container
    const resizer = this.#resizer
    this.#events.resizerItemEvents = []
    for (const direction of ['top', 'topright', 'right', 'bottomright', 'bottom', 'bottomleft', 'left', 'topleft']) {
      const resizerItem = document.createElement('div')
      resizerItem.classList.add('screenshot-resizer-item', `screenshot-resizer-${direction}`)
      let _snipInfo
      this.#events.resizerItemEvents.push(addDragEvent({
        node: resizerItem,
        upNode: container,
        moveNode: container,
        last: true,
        downCallback: () => {
          this.#toolbar = null
          this.#drawer = null
          _snipInfo = { ...this.#snipInfo }
          resizer.style.cursor = window.getComputedStyle(resizerItem).cursor
        },
        moveCallback: ({ endPosition, startPosition }) => {
          const x = endPosition.x - startPosition.x
          const y = endPosition.y - startPosition.y
          const tmpSnipInfo = { ..._snipInfo }
          if (direction.includes('top')) {
            tmpSnipInfo.top = _snipInfo.top + y < _snipInfo.top + _snipInfo.height - 10 ? _snipInfo.top + y : _snipInfo.top + _snipInfo.height - 10
            tmpSnipInfo.height = _snipInfo.height - y > 10 ? _snipInfo.height - y : 10
          }
          if (direction.includes('right')) {
            tmpSnipInfo.width = _snipInfo.width + x > 10 ? _snipInfo.width + x : 10
          }
          if (direction.includes('bottom')) {
            tmpSnipInfo.height = _snipInfo.height + y > 10 ? _snipInfo.height + y : 10
          }
          if (direction.includes('left')) {
            tmpSnipInfo.left = _snipInfo.left + x < _snipInfo.left + _snipInfo.width - 10 ? _snipInfo.left + x : _snipInfo.left + _snipInfo.width - 10
            tmpSnipInfo.width = _snipInfo.width - x > 10 ? _snipInfo.width - x : 10
          }
          this.#snipInfo = tmpSnipInfo
        },
        upCallback: () => {
          this.#initToolbar()
          this.#initDrawer()
          resizer.style.cursor = 'move'
        }
      }))
      wrapper.append(resizerItem)
    }
    resizer.append(wrapper)
  }

  #destroyResizer () {
    if (this.#events.resizerItemEvents) {
      for (const event of this.#events.resizerItemEvents) {
        event.stop()
      }
    }
    delete this.#events.resizerItemEvents
    clearNode(this.#resizer)
  }

  #stopResize () {
    this.#destroyResizer()
    if (this.#events.resizerEvent) {
      this.#events.resizerEvent.stop()
      delete this.#events.resizerEvent
    }
    this.#resizer.remove()
  }
  // endregion

  // region drawer
  #initDrawer () {
    this.#drawer = document.createElement('canvas')
    this.#drawer.classList.add('screenshot-drawer')
    this.#drawer.width = this.#snipInfo.width
    this.#drawer.height = this.#snipInfo.height
    const context = this.#drawer.getContext('2d')
    const widthScale = this.#originImg.naturalWidth / this.#originImg.width
    const heightScale = this.#originImg.naturalHeight / this.#originImg.height
    context.drawImage(this.#originImg, this.#snipInfo.left * widthScale, this.#snipInfo.top * heightScale, this.#snipInfo.width * widthScale, this.#snipInfo.height * heightScale, 0, 0, this.#snipInfo.width, this.#snipInfo.height)
    this.#snipper.append(this.#drawer)
  }

  #initDrawEvent () {
    this.#stopResize()
    const data = this.img
    if (!this.#infos.fabricDrawer) {
      this.#infos.fabricDrawer = new Canvas(this.#drawer)
      this.#canvas.setBackgroundImage(
        data.src,
        this.#canvas.renderAll.bind(this.#canvas)
      )
      this.#events.drawEvent = new ScreenshotFabricEvent(this.#canvas)
      this.#events.drawEvent.add('object:added', ({ target }) => {
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
  #initToolbar () {
    this.#toolbar = document.createElement('div')
    this.#toolbar.classList.add('screenshot-toolbar')
    this.#snipper.append(this.#toolbar)
    // todo 绘制矩形
    // this.#addTool({ name: '矩形', icon: 'square' })
    // todo 绘制椭圆
    // this.#addTool({ name: '椭圆', icon: 'circle' })
    this.#addToolWrite()
    this.#addToolMosaic()
    this.#addToolText()
    this.#addToolDivider()
    // todo 撤销修改
    // this.#addTool({ name: '撤销', icon: 'return', disabled: true })
    this.#addTool({
      name: '保存图片',
      icon: 'download',
      clickEvent: () => {
        dataURLToBlob(this.#canvas.toDataURL()).then((blob) => {
          saveAs(blob, 'clip.png')
          this.destroy()
        })
      }
    })
    this.#addTool({
      name: '退出',
      icon: 'close',
      color: 'red',
      clickEvent: () => {
        this.destroy()
      }
    })
    this.#addTool({
      name: '完成',
      icon: 'check',
      color: 'green',
      clickEvent: () => {
        dataURLToBlob(this.#canvas.toDataURL()).then((blob) => {
          if (window.ClipboardItem) {
            const data = [
              new window.ClipboardItem({
                [blob.type]: blob
              })
            ]
            navigator.clipboard.write(data).finally(() => {
              this.destroy()
            })
          } else {
            saveAs(blob, 'clip.png')
            this.destroy()
          }
        })
      }
    })
    if (this.#snipInfo.top + this.#snipInfo.height + 50 < this.#container.offsetHeight) {
      this.#toolbar.style.top = 'calc(100% + 8px)'
    } else {
      this.#toolbar.style.top = 'calc(100% - 50px)'
    }
    if (this.#snipInfo.left + this.#snipInfo.width - this.#toolbar.offsetWidth >= 0) {
      this.#toolbar.style.left = 'unset'
      this.#toolbar.style.right = '0'
    } else {
      this.#toolbar.style.left = '0'
      this.#toolbar.style.right = 'unset'
    }
  }

  #addTool ({ name = '', icon = '', color = 'white', disabled = false, clickEvent, activeEvent, pauseEvent } = {}) {
    this.#tools[name] = new ScreenshotTool({
      name,
      icon,
      color,
      disabled,
      clickEvent: clickEvent
        ? () => {
            if (!this.#tools[name].disabled) {
              clickEvent()
            }
          }
        : () => {
            this.#initDrawEvent()
            this.#switchActiveTool(this.#tools[name])
          },
      activeEvent,
      pauseEvent
    })
    this.#toolbar.append(this.#tools[name].node)
    return this.#tools[name]
  }

  #addToolDivider () {
    const dom = document.createElement('div')
    dom.classList.add('screenshot-toolbar-divider')
    this.#toolbar.append(dom)
  }

  #addToolWrite () {
    this.#addTool({
      name: '画笔',
      icon: 'write',
      activeEvent: () => {
        this.#canvas.freeDrawingBrush = new PencilBrush(this.#canvas)
        // 设置画笔颜色
        this.#canvas.freeDrawingBrush.color = 'red'
        // 设置画笔粗细
        this.#canvas.freeDrawingBrush.width = 5
        this.#canvas.isDrawingMode = true
        this.#canvas.selection = false
      },
      pauseEvent: () => {
        this.#canvas.isDrawingMode = false
        this.#canvas.selection = true
      }
    })
  }

  #addToolMosaic () {
    this.#addTool({
      name: '马赛克',
      icon: 'mosaic',
      activeEvent: () => {
        this.#canvas.selection = false
        this.#canvas.isDrawingMode = true
        const brush = this.#canvas.freeDrawingBrush = new MosaicBrush(this.#canvas)
        brush.color = 'white'
        brush.width = 12
      },
      pauseEvent: () => {
        this.#canvas.isDrawingMode = false
        this.#canvas.selection = true
      }
    })
  }

  #addToolText () {
    const event = createTextbox.bind(this)
    const tool = this.#addTool({
      name: '文本',
      icon: 'text',
      activeEvent: () => {
        this.#canvas.defaultCursor = 'text'
        this.#canvas.selection = false
        this.#events.drawEvent.add('mouse:down', event)
      },
      pauseEvent: () => {
        this.#canvas.defaultCursor = 'default'
        this.#canvas.selection = true
        this.#events.drawEvent.remove('mouse:down', event)
      }
    })

    function createTextbox (e) {
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
      this.#switchActiveTool(tool)
      this.#canvas.add(textbox)
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
      this.#canvas.setActiveObject(textbox)
      this.#canvas.renderAll()
    }
  }

  #switchActiveTool (tool) {
    if (!tool.active) {
      for (const name in this.#tools) {
        if (name !== tool.name) {
          this.#tools[name].active = false
        }
      }
    }
    tool.active = !tool.active
  }
  // endregion
}
