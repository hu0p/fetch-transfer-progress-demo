export async function downloadFile(url, onProgress) {
  let bytesReceived = 0
  let reader = null
  const chunks = []

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`)
    }

    const totalSize = parseInt(response.headers.get("content-length") || "0")

    reader = response.body.getReader()

    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      chunks.push(value)
      bytesReceived += value.length
      const percentage = totalSize > 0 ? (bytesReceived / totalSize) * 100 : 0
      onProgress(percentage, bytesReceived, totalSize)
    }
  } finally {
    if (reader) {
      reader.releaseLock()
    }
  }

  return new Blob(chunks)
}
