# Fetch Transfer Progress Demo

A demo showcasing real-time upload and download progress tracking using the Fetch API. Hopefully this can serve as an easy reference implementation since the documentation out there for this sort of thing isn't great.

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd fetch-transfer-progress-demo
```

2. Install dependencies:

```bash
npm install
```

3. Install [mkcert](https://github.com/FiloSottile/mkcert)

Refer to the [mkcert installation instructions](https://github.com/FiloSottile/mkcert?tab=readme-ov-file#installation) for your platform.

transformStreams require HTTP/2, and HTTP/2 requires TLS, so we need a self-signed certificate to showcase our little upload demo. This project uses mkcert create and install that certificate on any platform. mkcert automates the trust part of the process, so you don't have to bypass any warnings, manually generate certificates, or move around files. It makes the demo just work!

4. Start the development server:

```bash
npm run dev
```

This command will:

- Set up the uploads directory in `src/server/uploads`
- Create a 50MB demo file for download testing
- Generate the required self-signed certificate using mkcert in `src/server/`
- Start the Fastify server on HTTPS (port 3001)
- Start the Vite development server from `src/client/`

5. Open your browser and navigate to the URL shown in the terminal (typically `http://localhost:5173`)
