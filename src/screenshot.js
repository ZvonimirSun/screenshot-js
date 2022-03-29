import domToImage from "dom-to-image";
import "./screenshot.scss";

export default class ScreenShot {
  static getImage({ node, width, height, callback = () => {} }) {
    return new Promise((resolve, reject) => {
      if (!(node instanceof HTMLElement)) {
        reject();
      }
      let scale;
      if (width && height) {
        scale = Math.min(node.offsetWidth / width, node.offsetHeight / height);
      } else {
        scale = 1;
      }
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
      domToImage
        .toBlob(node, param)
        .then((val) => {
          callback(val);
          resolve(val);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static getMergeImage({ imgList = [], width, height, callback = () => {} }) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      let flag = 0;
      imgList.forEach((item) => {
        if (item.img instanceof HTMLImageElement) {
          context.drawImage(item.img, 0, 0, item.width, item.height);
          flag++;
        } else if (typeof item.img === "string") {
          const img = new Image();
          img.src = item.img;
          img.onload = () => {
            context.drawImage(
              img,
              item.x || 0,
              item.y || 0,
              item.width,
              item.height
            );
            flag++;
            if (flag === imgList.length) {
              const data = canvas.toDataURL();
              callback(data);
              resolve(data);
            }
          };
          img.onerror = () => {
            flag++;
            if (flag === imgList.length) {
              const data = canvas.toDataURL();
              callback(data);
              resolve(data);
            }
          };
        }
      });
      if (flag === imgList.length) {
        const data = canvas.toDataURL();
        callback(data);
        resolve(data);
      }
    });
  }

  constructor({ node, img } = {}) {
    if (!(node instanceof HTMLElement)) {
      throw new Error("node must be HTMLElement");
    }
    if (node.__SCREEN_SHOT_GENERATED__) {
      throw new Error("node has been generated by ScreenShot");
    }

    this._initDom({ node, img });
    this._initEvent();
  }

  _initDom({ node, img }) {
    this._initNode(node);
    this._initImage(img);
    this._initSnipper();
  }

  _initNode(node) {
    this._node = node;
    this._node.__SCREEN_SHOT_GENERATED__ = true;
    this._clearDom(this._node);
    this._container = document.createElement("div");
    this._container.classList.add("screenshot");
    this._node.appendChild(this._container);
  }

  _initImage(img) {
    if (img instanceof HTMLImageElement) {
      this._img = img;
    } else if (typeof img === "string") {
      this._img = new Image();
      this._img.src = img;
    } else {
      return;
    }
    this._img.classList.add("screenshot-image");
    this._container.appendChild(this._img);
  }

  _initSnipper() {
    this._snipper = document.createElement("div");
    this._snipper.classList.add("screenshot-snipper");
    const nodeStyle = getComputedStyle(this._container);
    const snipperBorderWidth = Math.max(
      parseFloat(nodeStyle.width),
      parseFloat(nodeStyle.height)
    );
    this._snipper.style.borderWidth = snipperBorderWidth + "px";
    this._snipper.style.transform = `matrix(1,0,0,1,${-snipperBorderWidth},${-snipperBorderWidth})`;
    this._container.appendChild(this._snipper);
  }

  _initEvent() {
    let startPosition;
    let moveFunc;
    let downFunc = _handleMouseDown.bind(this);
    let upFunc = _handleMouseUp.bind(this);
    this._container.addEventListener("click", () => {});
    this._container.addEventListener("mousedown", downFunc);
    this._container.addEventListener("mouseup", upFunc);

    function _handleMouseDown(e) {
      this._snipper.style.borderColor = "rgba(0,0,0,0.6)";
      this._snipper.style.cursor = "crosshair";
      this._destroyResizer();
      this._destroyDrawer();
      if (moveFunc) {
        this._container.removeEventListener("mousemove", moveFunc);
      }
      startPosition = {
        x: e.clientX,
        y: e.clientY,
      };
      this._snipInfo = {};
      moveFunc = _handleMouseMove.bind(this);
      this._container.addEventListener("mousemove", moveFunc);
    }

    function _handleMouseMove(e) {
      const currentPosition = {
        x: e.clientX,
        y: e.clientY,
      };
      const snipperBorderWidth = parseFloat(this._snipper.style.borderWidth);
      this._snipInfo = {
        width: Math.abs(currentPosition.x - startPosition.x),
        height: Math.abs(currentPosition.y - startPosition.y),
        x:
          Math.min(currentPosition.x, startPosition.x) -
          this._container.offsetLeft,
        y:
          Math.min(currentPosition.y, startPosition.y) -
          this._container.offsetTop,
      };
      this._snipper.style.width = this._snipInfo.width + "px";
      this._snipper.style.height = this._snipInfo.height + "px";
      this._snipper.style.transform = `matrix(1,0,0,1,${
        this._snipInfo.x - snipperBorderWidth
      },${this._snipInfo.y - snipperBorderWidth})`;
    }

    function _handleMouseUp() {
      this._snipper.style.cursor = "default";
      if (moveFunc) {
        this._container.removeEventListener("mousemove", moveFunc);
        this._container.removeEventListener("mousedown", downFunc);
        this._container.removeEventListener("mouseup", upFunc);
        moveFunc = null;
        downFunc = null;
        upFunc = null;
        this._initResizer();
      }
    }
  }

  _initResizer() {
    this._destroyResizer();
    this._resizer = document.createElement("div");
    this._resizer.classList.add("screenshot-snipper-resizer");
    this._snipper.append(this._resizer);
  }

  _destroyResizer() {
    if (this._resizer) {
      this._resizer.remove();
      delete this._resizer;
    }
  }

  _initDrawer() {
    this._destroyDrawer();
    this._drawer = document.createElement("div");
    this._drawer.classList.add("screenshot-drawer");
    this._drawer.style.width = this._snipInfo.width + "px";
    this._drawer.style.height = this._snipInfo.height + "px";
    this._drawer.style.transform = `matrix(1,0,0,1,${this._snipInfo.x},${this._snipInfo.y})`;
    this._container.appendChild(this._drawer);
    this._initDrawerEvent();
  }

  _destroyDrawer() {
    if (this._drawer) {
      this._drawer.remove();
      delete this._drawer;
    }
  }

  _initDrawerEvent() {
    this._drawer.addEventListener("mousedown", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  /**
   * 清空节点
   * @param {HTMLElement} node
   */
  _clearDom(node) {
    if (!(node instanceof HTMLElement)) {
      throw new Error("node must be HTMLElement");
    }
    while (node.firstChild) {
      node.removeChild(node.lastChild);
    }
  }

  destroy(callback = () => {}) {
    this._clearDom(this._node);
    delete this._node.__SCREEN_SHOT_GENERATED__;
    delete this._node;
    delete this._container;
    delete this._img;
    delete this._snipper;
    delete this._resizer;
    delete this._snipInfo;
    delete this._drawer;
    callback();
  }
}
