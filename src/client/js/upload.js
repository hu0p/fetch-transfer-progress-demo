export async function uploadFile(file, onProgress) {
  let bytesTransferred = 0

  // Feature detection for duplex streaming support
  const supportsDuplexStreaming = (() => {
    try {
      return "duplex" in new Request("", { method: "POST" })
    } catch {
      return false
    }
  })()

  try {
    // Create transform stream for progress tracking (same for all browsers)
    const progressTrackingStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        bytesTransferred += chunk.byteLength
        const percentage = (bytesTransferred / file.size) * 100
        onProgress(percentage, bytesTransferred, file.size)
      },
    })

    let requestBody
    let fetchOptions

    if (supportsDuplexStreaming) {
      // Chrome: Use pipeThrough with duplex support
      requestBody = file.stream().pipeThrough(progressTrackingStream)
      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": file.size.toString(),
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: requestBody,
        duplex: "half",
      }
    } else {
      // Safari/Firefox: Use pipeTo without duplex (will fail with clear error message in Safari and silently fail in Firefox by uploading [object ReadableStream] text in place of the file without streaming)
      const { readable, writable } = progressTrackingStream
      file.stream().pipeTo(writable)
      requestBody = readable

      fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": file.size.toString(),
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: requestBody,
      }
    }

    const response = await fetch(
      "https://localhost:3001/api/upload",
      fetchOptions
    )

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}
