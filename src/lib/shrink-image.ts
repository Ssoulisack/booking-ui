/** The biggest slip picture the server takes is 3.5 MB; a phone photo is often more, so it is made smaller first */
const SMALL_ENOUGH = 1_500_000
const LONGEST_SIDE = 1600

/**
 * A picture ready to upload: small pictures go as they are; a big photo is drawn smaller (1600 px on its longest
 * side) and saved as a JPEG. A browser that cannot do that sends the original (the server says if it is too big).
 */
export async function shrinkImage(file: File): Promise<Blob> {
  if (file.size <= SMALL_ENOUGH) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(
      1,
      LONGEST_SIDE / Math.max(bitmap.width, bitmap.height),
    )
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/jpeg", 0.85),
    )
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}
