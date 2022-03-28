import domToImage from "dom-to-image";

export default class screenshot {
  static getImage(node) {
    const scale = Math.min(
      node.offsetWidth / contentWidth,
      node.offsetHeight / contentHeight
    );
    const style = {
      transform: "scale(" + scale + ")",
      transformOrigin: "top left",
      width: node.offsetWidth + "px",
      height: node.offsetHeight + "px",
    };
    const param = {
      height: node.offsetHeight * scale,
      width: node.offsetWidth * scale,
      quality: 1,
      style,
    };
    return domToImage.toBlob(node, param);
  }
}
