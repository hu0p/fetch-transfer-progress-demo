import Fastify from "fastify"
import { createWriteStream, createReadStream, promises as fs } from "fs"
import { Transform } from "stream"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, "uploads")

// throttle upload/download for demo purposes
function createThrottleStream(bytesPerSecond = 1024 * 8000) {
  let lastTime = Date.now()
  let bytesThisSecond = 0

  return new Transform({
    transform(chunk, _encoding, callback) {
      const now = Date.now()
      const timeDiff = now - lastTime

      // Reset counter every second
      if (timeDiff >= 1000) {
        bytesThisSecond = 0
        lastTime = now
      }

      // Calculate how long to wait
      bytesThisSecond += chunk.length
      const delay =
        bytesThisSecond > bytesPerSecond ? Math.max(0, 1000 - timeDiff) : 0

      if (delay > 0) {
        setTimeout(() => {
          this.push(chunk)
          callback()
        }, delay)
      } else {
        this.push(chunk)
        callback()
      }
    },
  })
}

// we need HTTP/2, and HTTP/2 only works over TLS, so we need a self-signed certificate
const fastify = Fastify({
  logger: true,
  http2: true,
  https: {
    key: await fs.readFile(path.join(__dirname, "server.key")),
    cert: await fs.readFile(path.join(__dirname, "server.crt")),
  },
})

// Register CORS plugin
await fastify.register(import("@fastify/cors"), {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Content-Length",
    "X-File-Name",
  ],
})

// Configure Fastify to handle raw binary uploads without parsing
fastify.addContentTypeParser(
  "application/octet-stream",
  (_request, _payload, done) => {
    // Don't parse the payload, let us handle the raw stream
    done(null, undefined)
  }
)

fastify.post("/api/upload", (request, reply) => {
  const fileName = decodeURIComponent(
    request.headers["x-file-name"] || "uploaded-file"
  )
  const sanitizedName = path.basename(fileName)
  const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${sanitizedName}`)

  let totalBytes = 0

  const writeStream = createWriteStream(filePath)

  writeStream.on("finish", () => {
    reply.code(200).header("Content-Type", "application/json").send({
      success: true,
      filename: sanitizedName,
      size: totalBytes,
    })
  })

  writeStream.on("error", (error) => {
    reply.code(500).send({
      success: false,
      error: error.message,
    })
  })

  const uploadThrottleStream = createThrottleStream()

  uploadThrottleStream.on("data", (chunk) => {
    totalBytes += chunk.length
  })

  uploadThrottleStream.on("error", (error) => {
    writeStream.destroy()
    reply.code(500).send({
      success: false,
      error: error.message,
    })
  })

  const req = request.raw

  req.on("error", (error) => {
    writeStream.destroy()
    reply.code(500).send({
      success: false,
      error: error.message,
    })
  })

  req.pipe(uploadThrottleStream).pipe(writeStream)
})

fastify.get("/api/download/:filename", async (request, reply) => {
  try {
    const filename = request.params.filename
    const filePath = path.join(__dirname, "uploads", filename)

    try {
      await fs.access(filePath)
    } catch {
      return reply.code(404).send({ error: "File not found" })
    }

    const stats = await fs.stat(filePath)

    reply.header("Content-Type", "application/octet-stream")
    reply.header("Content-Length", stats.size)
    reply.header("Content-Disposition", `attachment; filename="${filename}"`)

    const readStream = createReadStream(filePath)
    const throttleStream = createThrottleStream()

    return reply.send(readStream.pipe(throttleStream))
  } catch (error) {
    return reply.code(500).send({ error: error.message })
  }
})

const port = 3001
try {
  await fastify.listen({ port, host: "0.0.0.0" })
  console.log(`HTTP/2 Fastify server running on https://localhost:${port}`)
  console.log(`Upload directory: ${UPLOAD_DIR}`)
  console.log(
    "Note: You may need to accept the self-signed certificate in your browser"
  )
} catch (err) {
  fastify.log.error(err)
}
