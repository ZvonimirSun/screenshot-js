/**
 * 清空节点
 * @param {HTMLElement} node
 */
function clearNode (node) {
  if (!(node instanceof window.HTMLElement)) {
    throw new Error('node must be HTMLElement')
  }
  while (node.firstChild) {
    node.removeChild(node.lastChild)
  }
}

function addDragEvent ({ node, moveNode, upNode, moveCallback = () => {}, downCallback = () => {}, upCallback = () => {}, last = false } = {}) {
  if (!(node instanceof window.HTMLElement)) {
    throw new Error('node must be HTMLElement')
  }

  let startPosition = null
  upNode = upNode || node
  moveNode = moveNode || node

  node.addEventListener('mousedown', _handleMouseDown)
  upNode.addEventListener('mouseup', _handleMouseUp)
  let isDown = false

  function _handleMouseDown (e) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    if (!isDown) {
      isDown = true
      startPosition = {
        x: e.clientX,
        y: e.clientY
      }
      moveNode.addEventListener('mousemove', _handleMouseMove)
      downCallback({ startPosition })
    }
  }

  function _handleMouseMove (e) {
    if (!isDown) return
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
    if (e.button !== 0) return
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
    isDown = false
  }

  function stop () {
    last = false
    isDown = false
    moveNode.removeEventListener('mousemove', _handleMouseMove)
    node.removeEventListener('mousedown', _handleMouseDown)
    upNode.removeEventListener('mouseup', _handleMouseUp)
    startPosition = null
  }

  return {
    stop
  }
}

async function dataURLToBlob (dataURI) {
  return await (await window.fetch(dataURI)).blob()
}

async function blobToDataURL (blob) {
  return await (await window.fetch(window.URL.createObjectURL(blob))).text()
}

function log (...msg) {
  console.log('%c[' + new Date().toLocaleString('zh', { hour12: false }) + '] %cINFO: ' + msg.join(' '), 'color:yellow', 'color: green')
}

function error (...msg) {
  console.log('%c[' + new Date().toLocaleString('zh', { hour12: false }) + '] %cERROR: ' + msg.join(' '), 'color:yellow', 'color: red')
}

function removeAll (list = [], item, callback = () => {}) {
  let index = list.indexOf(item)
  while (index > -1) {
    callback(list.splice(index, 1)[0])
    index = list.indexOf(item)
  }
}
export {
  clearNode,
  addDragEvent,
  dataURLToBlob,
  blobToDataURL,
  log,
  error,
  removeAll
}
