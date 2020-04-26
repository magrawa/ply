import * as osLocale from 'os-locale';
import { PlyOptions } from './options';
import { Suite } from './suite';
import { Retrieval } from './retrieval';
import { Request, PlyRequest } from './request';
import { ResultPaths, Runtime } from './runtime';
import { Logger } from './logger';
import * as yaml from './yaml';

export class RequestLoader {

    constructor(readonly locations: string[], private options: PlyOptions, private logger: Logger) {
    }

    async load(): Promise<Suite<Request>[]> {
        const retrievals = this.locations.map(loc => new Retrieval(loc));
        // load request files in parallel
        const promises = retrievals.map(retr => this.loadSuite(retr));
        return await Promise.all(promises);
    }

    async loadSuite(retrieval: Retrieval): Promise<Suite<Request>> {

        const contents = await retrieval.read();
        if (!contents) {
            throw new Error('Cannot retrieve: ' + retrieval.location.absolute);
        }

        let suiteName = retrieval.location.base;
        if (suiteName.endsWith('.ply')) {
            suiteName = suiteName.substring(0, suiteName.length - 4);
        }
        let results = await ResultPaths.create(this.options, suiteName, retrieval);

        const runtime = new Runtime(
            await osLocale(),
            this.options,
            this.logger,
            retrieval,
            results
        );

        const suite = new Suite<Request>(
            retrieval.location.base,
            'request',
            retrieval.location.relativeTo(this.options.testsLocation),
            runtime,
            0,
            contents.split(/\r?\n/).length - 1
        );

        const obj = yaml.load(retrieval.location.path, contents);
        let lastRequest: Request | undefined = undefined;
        for (const key of Object.keys(obj)) {
            let startLine = obj[key].__line;
            let request = new PlyRequest(key, Object.assign(obj[key], {startLine, __line: undefined}) as Request);
            if (lastRequest && lastRequest.startLine && request.startLine) {
                lastRequest.endLine = await this.getEndLine(retrieval, lastRequest.startLine, request.startLine - 1);
            }
            lastRequest = request;
            suite.add(request);
        }
        if (lastRequest && lastRequest.startLine) {
            lastRequest.endLine = await this.getEndLine(retrieval, lastRequest.startLine);
        }

        return suite;
    }

    async getEndLine(retrieval: Retrieval, start: number, end: number | undefined = undefined): Promise<number | undefined> {
        let lines = await retrieval.readLines(start, end);
        if (lines) {
            lines.reverse();
            let endLine = end || (start + lines.length - 1);
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line || line.startsWith('#')) {
                    endLine--;
                }
                else {
                    break;
                }
            }
            return endLine;
        }
    }
}
