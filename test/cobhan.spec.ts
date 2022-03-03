import { assert } from 'chai';
import { allocate_cbuffer } from '../src/cobhan'

describe('Cobhan', function() {
    it('Allocate Test', function() {
        const buf = allocate_cbuffer(1024);
        assert(buf != null)
    });
});


