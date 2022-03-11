import { assert } from 'chai';
import { allocate_cbuffer, buffer_to_cbuffer, cbuffer_to_buffer, cbuffer_to_json, cbuffer_to_string, json_to_cbuffer, string_to_cbuffer } from '../src/cobhan'

describe('Cobhan', function() {
    it('Allocate Test', function() {
        const buf = allocate_cbuffer(1024);
        assert(buf != null)
    });
    it('StringAndBufferRoundTrip', function() {
      const input = "String"
      const buf = string_to_cbuffer(input);
      const bytes = cbuffer_to_buffer(buf);
      const buf2 = buffer_to_cbuffer(bytes)
      const output = cbuffer_to_string(buf2);
      assert(input == output);
    });
    it('JsonRoundTrip', function() {
      const input = {
        name1: 'value1',
        name2: 'value2'
      };
      const buf = json_to_cbuffer(input);
      const output = cbuffer_to_json(buf);
      assert(input.name1 == output.name1);
      assert(input.name2 == output.name2);
    })
});
