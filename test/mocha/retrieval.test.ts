import * as assert from 'assert';
import { Retrieval } from '../../src/retrieval';

describe('Retrieval', () => {

    it('should read file', async () => {
        let retrieval = new Retrieval('.gitignore');
        assert.ok(!retrieval.location.ext);
        let exists = await retrieval.exists;
        assert.ok(exists);
        let contents = await retrieval.read();
        console.log("contents: " + contents);
        assert.ok(contents && contents.indexOf('node_modules') >= 0);
    });

    it('should read url', async () => {
        let retrieval = new Retrieval('https://raw.githubusercontent.com/ply-ct/ply/master/.gitignore');
        let exists = await retrieval.exists;
        assert.ok(exists);
        let contents = await retrieval.read();
        console.log("contents: " + contents);
        assert.ok(contents && contents.indexOf('node_modules') >= 0);
    });
});