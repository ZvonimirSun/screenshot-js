async function test() {
  window.screenShotInstance = new ScreenShot({
    node: document.getElementsByClassName("editor")[0],
    img: "https://img.iszy.xyz/1648524178925.png?x-oss-process=style/big",
  });
}

test();
