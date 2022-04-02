import { fabric } from 'fabric'

const { PatternBrush } = fabric

export default class MosaicBrush extends PatternBrush {
  constructor (canvas, options) {
    super(canvas, options)
    this.source = this.getPatternSrc()
  }

  getPatternSrc () {
    const squareWidth = 10
    const squareDistance = 0
    const patternCanvas = fabric.document.createElement('canvas')
    patternCanvas.width = patternCanvas.height = squareWidth + squareDistance
    const ctx = patternCanvas.getContext('2d')

    // Creating a mosaic
    const imageData = ctx.createImageData(10, 10)
    const pixels = imageData.data

    // Dimensions of each tile
    const tileWidth = imageData.width
    const tileHeight = imageData.height

    // Loop through each tile
    for (let r = 0; r < tileWidth; r++) {
      for (let c = 0; c < tileHeight; c++) {
        // Set the pixel values for each tile
        const gray = Math.random() * 120 + 100 // 255
        const index = (r * tileWidth + c) * 4
        pixels[index] = gray
        pixels[index + 1] = gray
        pixels[index + 2] = gray
        pixels[index + 3] = 255
      }
    }
    // Draw image data to the canvas
    ctx.putImageData(imageData, 0, 0)

    return patternCanvas
  }
}
