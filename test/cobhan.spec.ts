import { assert, expect } from 'chai';
import { allocate_cbuffer, buffer_to_cbuffer, buffer_to_int64, cbuffer_to_buffer, cbuffer_to_json, cbuffer_to_string, int64_to_buffer, json_to_cbuffer, load_library_direct, load_platform_library, string_to_cbuffer } from '../src/cobhan'

describe('Cobhan', function () {
  it('Allocate Test', function () {
    const buf = allocate_cbuffer(1024);
    assert(buf != null)
  });
  it('StringAndBufferRoundTrip', function () {
    const input = "String"
    const buf = string_to_cbuffer(input);
    const bytes = cbuffer_to_buffer(buf);
    const buf2 = buffer_to_cbuffer(bytes)
    const output = cbuffer_to_string(buf2);
    assert(input == output);
  });
  it('NullString', function () {
    const buf = string_to_cbuffer(null);
    const output = cbuffer_to_string(buf);
    assert(output == "");
  });
  it('NullJson', function () {
    const buf = json_to_cbuffer(null);
    const output = cbuffer_to_json(buf);
    assert(output == null);
  });
  it('JsonRoundTrip', function () {
    const input = {
      name1: 'value1',
      name2: 'value2'
    };
    const buf = json_to_cbuffer(input);
    const output = cbuffer_to_json(buf);
    assert(input.name1 == output.name1);
    assert(input.name2 == output.name2);
  });
  it('Int64RoundTrip', function () {
    const input = 1234567890
    const buf = int64_to_buffer(input)
    const output = buffer_to_int64(buf)
    assert(input == output);
  });
  it('LibraryNotFound', function () {
    expect(function () {
      load_platform_library('/nonexistent', 'library', '');
    }).to.throw();
  });
  it('LibraryNotFoundDirect', function () {
    expect(function () {
      load_library_direct('/nonexistent/library', '');
    }).to.throw();
  });
});
