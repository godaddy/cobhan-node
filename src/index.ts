import ffi from 'ffi-napi';
import path from 'path';
import fs from 'fs';

const header_size = 64 / 8
const sizeof_int32 = 32 / 8

function json_to_cbuffer(obj: any): Buffer {
  if (obj == null) {
    const buffer = Buffer.allocUnsafe(header_size)
    buffer.writeInt64LE(0, 0)
    return buffer
  }
  return string_to_cbuffer(JSON.stringify(obj))
}

function string_to_cbuffer(str: string): Buffer {
  if (str == null) {
    const buffer = Buffer.allocUnsafe(header_size)
    buffer.writeInt64LE(0, 0)
    return buffer
  }
  // string.length returns number of two byte UTF-16 code units
  const buffer: Buffer = Buffer.allocUnsafe(header_size + str.length * 2)
  buffer.writeInt32LE(str.length, 0)
  buffer.writeInt32LE(0, sizeof_int32) // Reserved - must be zero
  buffer.write(str, header_size, 'utf8')
  return buffer
}

function int64_to_buffer(number: number): Buffer {
  const buffer: Buffer = Buffer.allocUnsafe(64 / 8)
  buffer.writeBigInt64LE(BigInt(number), 0)
  return buffer
}

function buffer_to_int64(buffer: Buffer): string | number {
  return buffer.readInt64LE(0)
}

function cbuffer_to_string(buf: Buffer): string {
  const length: number = buf.readInt32LE(0)
  if (length < 0) {
    return temp_to_string(buf, length)
  }
  return buf.toString('utf8', header_size, length + header_size)
}

function cbuffer_to_json(buf: Buffer): any {
  const str = cbuffer_to_string(buf)
  return JSON.parse(str)
}

function temp_to_string(buf: Buffer, length: number): string {
  length = 0 - length
  const tempfilename: string = buf.toString('utf8', header_size, length + header_size)
  const result: string = fs.readFileSync(tempfilename, 'utf8')
  fs.unlinkSync(tempfilename)
  return result
}

function cbuffer_to_buffer(buf: Buffer): Buffer {
  const length = buf.readInt32LE(0)
  if (length < 0) {
    return temp_to_buffer(buf, length)
  }
  return buf.slice(header_size, header_size + length)
}

function temp_to_buffer(buf: Buffer, length: number): Buffer {
  length = 0 - length
  const tempfilename: string = buf.toString('utf8', header_size, length + header_size)
  const result: Buffer = fs.readFileSync(tempfilename)
  fs.unlinkSync(tempfilename)
  return result
}

function buffer_to_cbuffer(buf: Buffer): Buffer {
  const buffer = Buffer.allocUnsafe(header_size + buf.byteLength)
  buffer.writeInt32LE(buf.byteLength, 0)
  buffer.writeInt32LE(0, sizeof_int32) // Reserved - must be zero
  buffer.fill(buf, header_size)
  return buffer
}

function allocate_cbuffer(size: number): Buffer {
  const buffer = Buffer.allocUnsafe(header_size + size)
  buffer.writeInt32LE(size, 0)
  buffer.writeInt32LE(0, sizeof_int32) // Reserved - must be zero
  return buffer
}

function load_platform_library(libraryPath: string, libraryName: string, functions: any): ffi.Library {

  let osExt = { 'win32': '.dll', 'linux': '.so', 'darwin': '.dylib' }[process.platform.toLowerCase()];
  if (typeof osExt === 'undefined') {
    throw new Error('Unsupported operating system');
  }

  let needChdir = false;
  if (osExt == '.so') {
    const files = fs.readdirSync('/lib').filter((fn) => fn.startsWith('libc.musl'));
    if (files.length > 0) {
      osExt = '-musl.so';
      needChdir = true;
    }
  }

  const archPart = { 'arm64': '-arm64', 'x64': '-x64' }[process.arch.toLowerCase()];
  if (typeof archPart === 'undefined') {
    throw new Error('Unsupported architecture');
  }

  const libraryFile = path.resolve(path.join(libraryPath, libraryName + archPart + osExt));

  let oldCwd = "";
  if (needChdir) {
    oldCwd = process.cwd();
    process.chdir(libraryPath);
  }

  const library: ffi.Library = new ffi.Library(libraryFile, functions);

  if (needChdir) {
    process.chdir(oldCwd);
  }

  return library
}

function load_library_direct(libraryFilePath: string, functions: any): ffi.Library {
  return new ffi.Library(libraryFilePath, functions);
}

export default {
  load_platform_library, string_to_cbuffer, cbuffer_to_string, cbuffer_to_buffer, buffer_to_cbuffer, allocate_cbuffer, int64_to_buffer, buffer_to_int64, load_library_direct, json_to_cbuffer, cbuffer_to_json
};
