import { TestType, Plyable } from './ply';
import { Storage } from './storage';
import { Retrieval } from './retrieval';

/**
 * A suite represents one ply requests file (.ply.yaml), one ply case file (.ply.ts),
 * or a single folder within a Postman collection (a .postman_collection.json file
 * may have requests at the top level or may have folders).
 *
 * Suites cannot be nested.
 */
export class Suite<T extends Plyable> {

    private tests: Map<string,T> = new Map();

    /**
     * @param name suite name
     * @param type request/case/workflow
     * @param path relative path from tests location (forward slashes)
     * @param retrieval suite retrieval
     * @param expected expected results retrieval
     * @param actual actual results storage
     * @param tests? requests/cases/workflows
     */
    constructor(
        readonly name: string,
        readonly type: TestType,
        readonly path: string,
        readonly retrieval: Retrieval,
        readonly expected: Retrieval,
        readonly actual: Storage,
        readonly line: number = 0,
        tests: T[] = []) {
            for (const test of tests) {
                this.tests.set(test.name, test);
            }
    }

    add(test: T) {
        this.tests.set(test.name, test);
    }

    get(name: string): T | undefined {
        return this.tests.get(name);
    }

    getAll(): T[] {
        return Array.from(this.tests.values());
    }
}

