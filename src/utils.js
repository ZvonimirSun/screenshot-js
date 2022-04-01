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

  let startPosition
  upNode = upNode || node
  moveNode = moveNode || node

  node.addEventListener('click', _empty)
  node.addEventListener('mousedown', _handleMouseDown)
  upNode.addEventListener('mouseup', _handleMouseUp)
  let flag = true

  function _empty () {}

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
      node.removeEventListener('click', _empty)
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
    node.removeEventListener('click', _empty)
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

function log (msg) {
  console.log('[' + new Date().toLocaleString('zh', { hour12: false }) + '] ', msg)
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
  removeAll
}
