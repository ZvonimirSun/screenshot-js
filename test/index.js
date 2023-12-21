/* global Screenshot */
async function editScreenShot () {
  window.screenshotInstance = new Screenshot({
    node: document.getElementsByClassName('editor')[0],
    img: './test.png',
    destroyCallback () {
      console.log('destroyed')
    }
  })
}

async function getScreenShot () {
  const img = document.createElement('img')
  img.setAttribute('src', './test.png')
  img.setAttribute('crossOrigin', 'anonymous')
  document.getElementsByClassName('editor')[0].appendChild(img)
  img.onload = function () {
    img.style.width = img.offsetWidth + 'px'
    const dpi = 300
    const pageWidth = 420
    const pageHeight = 297

    const width = pageWidth / 25.4 * dpi
    const height = pageHeight / 25.4 * dpi

    Screenshot.getImage({
      node: img,
      width,
      height,
      dpi
    }).then(function (blob) {
      const resultImg = document.createElement('img')
      resultImg.setAttribute('src', window.URL.createObjectURL(blob))
      document.getElementsByClassName('editor')[0].appendChild(resultImg)
    })
  }
}

getScreenShot()
