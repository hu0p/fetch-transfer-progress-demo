export async function uploadFile(file, onProgress) {
  let bytesTransferred = 0

  try {
    const progressTrackingStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk)
        bytesTransferred += chunk.byteLength
        const percentage = (bytesTransferred / file.size) * 100
        onProgress(percentage, bytesTransferred, file.size)
      },
    })

    const response = await fetch("https://localhost:3001/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": file.size.toString(),
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file.stream().pipeThrough(progressTrackingStream),
      duplex: "half",
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}
