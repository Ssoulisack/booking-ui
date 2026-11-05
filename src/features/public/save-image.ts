/**
 * Give the visitor a picture to keep (a payment QR): on a phone the share sheet offers "Save image";
 * elsewhere the browser downloads it. Returns false when neither worked (the caller can open it instead).
 */
export async function saveImage(
  src: string,
  filename: string,
): Promise<boolean> {
  try {
    const blob = await (await fetch(src)).blob()
    const file = new File([blob], filename, { type: blob.type || "image/png" })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] })
      return true
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    return true
  } catch (err) {
    // the visitor closed the share sheet: nothing is wrong
    return err instanceof DOMException && err.name === "AbortError"
  }
}
