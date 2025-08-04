import { uploadFile } from "./upload.js"
import { downloadFile } from "./download.js"

// DOM elements
const fileInput = document.querySelector("#file-input"),
  uploadBtn = document.querySelector("#upload-btn"),
  downloadBtn = document.querySelector("#download-btn"),
  progressFill = document.querySelector("#progress-fill"),
  progressText = document.querySelector("#progress-text"),
  progressBytes = document.querySelector("#progress-bytes")

// prevent double operations edge case
let isOperationActive = false

// Progress functions
function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function setButtonsDisabled(disabled) {
  isOperationActive = disabled
  downloadBtn.disabled = disabled
  uploadBtn.disabled = disabled || !fileInput.files[0]
}

async function resetAfterMessage(message, delay = 2000) {
  progressText.textContent = message

  await new Promise((resolve) => setTimeout(resolve, delay))

  // reset to default state after showing message
  progressFill.style.width = "0%"
  progressText.textContent = "Ready"
  progressBytes.textContent = ""
  setButtonsDisabled(false)
}

function onProgress(percentage, bytesTransferred, totalBytes, operation) {
  progressFill.style.width = `${percentage}%`
  progressText.textContent = `${operation}: ${percentage.toFixed(1)}%`

  if (totalBytes > 0) {
    const transferred = formatBytes(bytesTransferred)
    const total = formatBytes(totalBytes)
    progressBytes.textContent = `${transferred} / ${total}`
  } else {
    progressBytes.textContent = ""
  }
}

async function withProgress(operationName, asyncOperation) {
  setButtonsDisabled(true)

  try {
    const result = await asyncOperation(
      (percentage, bytesTransferred, totalBytes) =>
        onProgress(percentage, bytesTransferred, totalBytes, operationName)
    )
    await resetAfterMessage(`${operationName} complete!`)
    return result
  } catch (error) {
    await resetAfterMessage(`${operationName} failed: ${error.message}`)
    throw error
  }
}

async function handleUpload() {
  const file = fileInput.files[0]
  if (!file) return

  await withProgress("Uploading", (onProgress) => uploadFile(file, onProgress))
}

async function handleDownload() {
  const demoFileName = "demo-file.bin"

  const blob = await withProgress("Downloading", (onProgress) =>
    downloadFile(
      `https://localhost:3001/api/download/${demoFileName}`,
      onProgress
    )
  )

  // trigger download
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = demoFileName
  a.click()
  URL.revokeObjectURL(url)
}

// Event listeners
fileInput.addEventListener(
  "change",
  (e) => (uploadBtn.disabled = isOperationActive || !e.target.files[0])
)
uploadBtn.addEventListener("click", handleUpload)
downloadBtn.addEventListener("click", handleDownload)
