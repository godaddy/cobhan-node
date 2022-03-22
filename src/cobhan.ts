import ffi from 'ffi-napi';
import path from 'path';
import fs from 'fs';

const header_size = 64 / 8;
const sizeof_int32 = 32 / 8;

const minimum_pool_size = 131072;
const minimum_cbuffer_size = 1024;

if (Buffer.poolSize < minimum_pool_size) {
  Buffer.poolSize = minimum_pool_size;
}

export function json_to_cbuffer(obj: any | null): Buffer {
  return string_to_cbuffer(JSON.stringify(obj))
}

export function string_to_cbuffer(str: string | null): Buffer {
  if (str == null) {
    const buffer = Buffer.allocUnsafe(header_size);
    buffer.writeInt64LE(0, 0);
    return buffer;
  }

  const byteLength: number = Buffer.byteLength(str,'utf8');
  const buffer: Buffer = Buffer.allocUnsafe(header_size + byteLength);
  buffer.writeInt32LE(str.length, 0);
  buffer.writeInt32LE(0, sizeof_int32); // Reserved - must be zero
  if (byteLength > 0) {
    buffer.write(str, header_size, 'utf8');
  }
  return buffer;
}

export function int64_to_buffer(number: number): Buffer {
  const buffer: Buffer = Buffer.allocUnsafe(64 / 8);
  buffer.writeBigInt64LE(BigInt(number), 0);
  return buffer;
}

export function buffer_to_int64(buffer: Buffer): string | number {
  return buffer.readInt64LE(0);
}

export function cbuffer_to_string(buf: Buffer): string {
  const length: number = buf.readInt32LE(0);
  if (length < 0) {
    return temp_to_string(buf, length);
  }
  return buf.toString('utf8', header_size, length + header_size);
}

export function cbuffer_to_json(buf: Buffer): any {
  const str = cbuffer_to_string(buf);
  return JSON.parse(str);
}

export function cbuffer_to_buffer(buf: Buffer): Buffer {
  const length = buf.readInt32LE(0);
  if (length < 0) {
    return temp_to_buffer(buf, length);
  }
  return buf.slice(header_size, header_size + length);
}

export function buffer_to_cbuffer(buf: Buffer): Buffer {
  const buffer = Buffer.allocUnsafe(header_size + buf.byteLength);
  buffer.writeInt32LE(buf.byteLength, 0);
  buffer.writeInt32LE(0, sizeof_int32); // Reserved - must be zero
  buf.copy(buffer, header_size);
  return buffer;
}

export function allocate_cbuffer(size: number): Buffer {
  if (size < minimum_cbuffer_size) {
    size = minimum_cbuffer_size;
  }
  const buffer = Buffer.allocUnsafe(header_size + size);
  buffer.writeInt32LE(size, 0);
  buffer.writeInt32LE(0, sizeof_int32); // Reserved - must be zero
  return buffer;
}

function is_alpine(): boolean {
  const files = fs.readdirSync('/lib').filter((fn) => fn.startsWith('libc.musl'));
  return files.length > 0;
}

export function load_platform_library(libraryPath: string, libraryName: string, functions: any): ffi.Library {

  let osExt = { 'win32': '.dll', 'linux': '.so', 'darwin': '.dylib' }[process.platform.toLowerCase()];
  if (typeof osExt === 'undefined') {
    throw new Error('Unsupported operating system');
  }

  let needChdir = false;
  if (osExt == '.so') {
    if (is_alpine()) {
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

export function load_library_direct(libraryFilePath: string, functions: any): ffi.Library {
  return new ffi.Library(libraryFilePath, functions);
}

function temp_to_buffer(buf: Buffer, length: number): Buffer {
  length = 0 - length;
  const tempfilename = buf.toString('utf8', header_size, length + header_size);
  const result = fs.readFileSync(tempfilename);
  fs.unlinkSync(tempfilename);
  return result;
}

function temp_to_string(buf: Buffer, length: number): string {
  length = 0 - length;
  const tempfilename = buf.toString('utf8', header_size, length + header_size);
  const result = fs.readFileSync(tempfilename, 'utf8');
  fs.unlinkSync(tempfilename);
  return result;
}
