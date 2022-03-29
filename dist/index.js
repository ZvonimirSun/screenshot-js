async function test() {
  const blob = await ScreenShot.getImage({
    node: document.getElementById("test"),
  });
  const url = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = url;

  document.getElementsByClassName("editor")[0].style.display = "block";

  window.screenShotInstance = new ScreenShot({
    node: document.getElementsByClassName("editor")[0],
    img,
  });
}

test();
