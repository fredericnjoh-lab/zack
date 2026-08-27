import assert from 'node:assert/strict'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { after, test } from 'node:test'
import {
  fetchBoundedImage,
  parseAllowedImageUrl,
} from './image-proxy.ts'

process.env.NODE_ENV = 'test'

function listen() {
  return new Promise<{ port: number; close: () => Promise<void> }>((resolve) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || '/'
      if (url === '/thumb') {
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': '4' })
        res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))
        return
      }
      if (url === '/video') {
        res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': '8' })
        res.end('videodata')
        return
      }
      if (url === '/huge') {
        res.writeHead(200, { 'content-type': 'image/jpeg' })
        res.write(Buffer.alloc(80, 1))
        res.end()
        return
      }
      if (url === '/huge-declared') {
        res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': '9999' })
        res.end('nope')
        return
      }
      if (url === '/redirect-ok') {
        res.writeHead(302, { location: '/thumb' })
        res.end()
        return
      }
      if (url === '/redirect-ssrf') {
        res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' })
        res.end()
        return
      }
      if (url === '/redirect-evil') {
        res.writeHead(302, { location: 'https://evil.example/steal' })
        res.end()
        return
      }
      res.statusCode = 404
      res.end()
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      assert(address && typeof address === 'object')
      resolve({
        port: address.port,
        close: () => new Promise((done) => server.close(() => done())),
      })
    })
  })
}

const server = await listen()
after(() => server.close())

test('parseAllowedImageUrl rejects dangerous and off-CDN URLs', () => {
  assert.equal(parseAllowedImageUrl('javascript:alert(1)'), undefined)
  assert.equal(parseAllowedImageUrl('data:image/gif;base64,AAAA'), undefined)
  assert.equal(parseAllowedImageUrl('https://evil.example/x.jpg'), undefined)
  assert.equal(parseAllowedImageUrl('https://cdninstagram.com.evil.example/x.jpg'), undefined)
  assert.equal(parseAllowedImageUrl('https://notfbcdn.net/x.jpg'), undefined)
  assert.equal(parseAllowedImageUrl('http://scontent.cdninstagram.com/x.jpg'), undefined)
})

test('parseAllowedImageUrl accepts Instagram/Facebook CDN hosts', () => {
  const ig = parseAllowedImageUrl('https://scontent.cdninstagram.com/v/t51.2885-15/x.jpg')
  assert.equal(ig?.hostname, 'scontent.cdninstagram.com')
  const fb = parseAllowedImageUrl('https://scontent-iad3-1.xx.fbcdn.net/v/t51/x.jpg')
  assert.equal(fb?.hostname, 'scontent-iad3-1.xx.fbcdn.net')
  assert.equal(parseAllowedImageUrl('https://cdninstagram.com/x.jpg')?.hostname, 'cdninstagram.com')
})

test('fetchBoundedImage returns a small image from an allowed host', async () => {
  const url = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/thumb`)
  assert(url)
  const result = await fetchBoundedImage(url)
  assert.ok('bytes' in result)
  assert.equal(result.contentType, 'image/jpeg')
  assert.equal(result.bytes.length, 4)
})

test('fetchBoundedImage follows same-host redirects and refuses off-host ones', async () => {
  const ok = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/redirect-ok`)
  assert(ok)
  const followed = await fetchBoundedImage(ok)
  assert.ok('bytes' in followed)

  const ssrf = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/redirect-ssrf`)
  assert(ssrf)
  assert.deepEqual(await fetchBoundedImage(ssrf), { status: 400 })

  const evil = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/redirect-evil`)
  assert(evil)
  assert.deepEqual(await fetchBoundedImage(evil), { status: 400 })
})

test('fetchBoundedImage rejects video payloads and oversized bodies without keeping them', async () => {
  const video = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/video`)
  assert(video)
  assert.deepEqual(await fetchBoundedImage(video), { status: 400 })

  const huge = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/huge`)
  assert(huge)
  assert.deepEqual(await fetchBoundedImage(huge, { maxBytes: 32 }), { status: 400 })

  const declared = parseAllowedImageUrl(`http://127.0.0.1:${server.port}/huge-declared`)
  assert(declared)
  assert.deepEqual(await fetchBoundedImage(declared, { maxBytes: 32 }), { status: 400 })
})
