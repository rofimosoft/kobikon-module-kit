const table = new Uint32Array(256)
for (let index = 0; index < 256; index += 1) {
  let crc = index
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  }
  table[index] = crc
}

export function zipStore(files) {
  const encoder = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const data = encoder.encode(text)
    const nameBytes = encoder.encode(name)
    const crc = crc32(data)
    const local = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(local.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, data.length, true)
    view.setUint32(22, data.length, true)
    view.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    parts.push(local, data)

    const header = new Uint8Array(46 + nameBytes.length)
    const directory = new DataView(header.buffer)
    directory.setUint32(0, 0x02014b50, true)
    directory.setUint16(4, 20, true)
    directory.setUint16(6, 20, true)
    directory.setUint32(16, crc, true)
    directory.setUint32(20, data.length, true)
    directory.setUint32(24, data.length, true)
    directory.setUint16(28, nameBytes.length, true)
    directory.setUint32(42, offset, true)
    header.set(nameBytes, 46)
    central.push(header)
    offset += local.length + data.length
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, central.length, true)
  endView.setUint16(10, central.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end], { type: "application/zip" })
}

function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
