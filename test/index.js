/* global Screenshot */
async function test () {
  window.screenshotInstance = new Screenshot({
    node: document.getElementsByClassName('editor')[0],
    img: 'https://img.iszy.xyz/1648524178925.png?x-oss-process=style/big',
    destroyCallback () {
      console.log('destroyed')
    },
    autoWelt: false,
    autoFull: true
  })
}

test()
