/* Admin-only photo preparation. Originals never leave the browser. */
(function () {
  "use strict";
  var queue = Promise.resolve();

  function decode(file) {
    if (window.createImageBitmap) return window.createImageBitmap(file, { imageOrientation: "from-image" });
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("ფოტო ვერ გაიხსნა. ატვირთეთ JPG, PNG ან WebP.")); };
      img.src = url;
    });
  }

  // Safari and every iPhone browser cannot write WebP from a canvas (they
  // silently hand back PNG). Those browsers get JPEG instead of a failed upload.
  var format = null;
  function toBlob(canvas, type, quality) {
    return new Promise(function (resolve) { canvas.toBlob(resolve, type, quality); });
  }
  async function encode(canvas, quality) {
    var blob;
    if (format !== "image/jpeg") {
      blob = await toBlob(canvas, "image/webp", quality);
      if (blob && blob.type === "image/webp") { format = "image/webp"; return blob; }
      if (format === "image/webp") throw new Error("ფოტოს დამუშავება ვერ მოხერხდა. სცადეთ ხელახლა.");
    }
    blob = await toBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.type !== "image/jpeg") {
      throw new Error("ფოტოს დამუშავება ვერ მოხერხდა. სცადეთ განახლებული ბრაუზერით.");
    }
    format = "image/jpeg";
    return blob;
  }

  async function prepare(file) {
    if (!file || !/^(image\/(jpeg|png|webp))$/i.test(file.type)) {
      throw new Error("აირჩიეთ JPG, PNG ან WebP ფოტო. HEIC/GIF ჯერ გადაიყვანეთ JPG-ში.");
    }
    if (file.size > 30 * 1024 * 1024) throw new Error("ფოტო ძალიან დიდია — მაქსიმუმ 30 MB.");
    var image = await decode(file);
    try {
      var width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
      if (!width || !height || width * height > 80000000) throw new Error("ფოტოს ზომა ძალიან დიდია. აირჩიეთ 80 მეგაპიქსელზე პატარა ფოტო.");
      var scale = Math.min(1, 1600 / width, 1600 / height);
      var maxWidth = Math.max(1, Math.round(width * scale));
      var widths = [480, 800].filter(function (w) { return w < maxWidth; }).concat(maxWidth);
      var variants = [];
      for (var i = 0; i < widths.length; i++) {
        var canvas = document.createElement("canvas");
        canvas.width = widths[i];
        canvas.height = Math.max(1, Math.round(height * widths[i] / width));
        var ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("ფოტოს დამუშავება ვერ მოხერხდა.");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        var budget = widths[i] <= 480 ? 80 * 1024 : widths[i] <= 800 ? 150 * 1024 : 300 * 1024;
        var blob;
        for (var quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
          blob = await encode(canvas, quality);
          if (blob.size <= budget * (blob.type === "image/jpeg" ? 1.5 : 1)) break;
        }
        // A very detailed photo may stay a little over the target; that is
        // still far lighter than the original, so it is kept, not refused.
        if (blob.size > budget * 3) throw new Error("ამ ფოტოს ზომა ვერ შემცირდა ხარისხის შენარჩუნებით. აირჩიეთ სხვა ფოტო ან წინასწარ შეამცირეთ.");
        variants.push({ blob: blob, width: canvas.width, height: canvas.height, ext: blob.type === "image/jpeg" ? "jpg" : "webp" });
        canvas.width = canvas.height = 1;
      }
      return variants;
    } finally {
      if (image.close) image.close();
    }
  }

  // Decode one full-resolution photo at a time, including multi-file drops.
  window.AGAVA_PREPARE_PHOTO = function (file) {
    var job = queue.then(function () { return prepare(file); });
    queue = job.catch(function () {});
    return job;
  };
})();
