import * as osLocale from 'os-locale';
import { PlyOptions } from './options';
import { Suite } from './suite';
import { Retrieval } from './retrieval';
import { Request, PlyRequest } from './request';
import { ResultPaths, Runtime } from './runtime';
import { Logger, LogLevel } from './logger';
import { Skip } from './skip';
import * as yaml from './yaml';
import { lines } from './util';

export class RequestLoader {

    private skip: Skip | undefined;

    constructor(
        readonly locations: string[],
        private options: PlyOptions
    ) {
        if (options.skip) {
            this.skip = new Skip(options.testsLocation, options.skip);
        }
    }

    async load(): Promise<Suite<Request>[]> {
        const retrievals = this.locations.map(loc => new Retrieval(loc));
        // load request files in parallel
        const promises = retrievals.map(retr => this.loadSuite(retr));
        const suites = await Promise.all(promises);
        suites.sort((s1, s2) => s1.name.localeCompare(s2.name));
        return suites;
    }

    sync(): Suite<Request>[] {
        const suites = [];
        for (const location of this.locations) {
            suites.push(this.syncSuite(new Retrieval(location)));
        }
        suites.sort((s1, s2) => s1.name.localeCompare(s2.name));
        return suites;
    }

    buildSuite(retrieval: Retrieval, contents: string, resultPaths: ResultPaths): Suite<Request> {
        const runtime = new Runtime(
            osLocale.sync(),
            this.options,
            retrieval,
            resultPaths
        );

        const logger = new Logger({
            level: this.options.verbose ? LogLevel.debug : LogLevel.info,
            prettyIndent: this.options.prettyIndent
        }, runtime.results.log);

        const suite = new Suite<Request>(
            retrieval.location.base,
            'request',
            retrieval.location.relativeTo(this.options.testsLocation),
            runtime,
            logger,
            0,
            lines(contents).length - 1
        );

        const obj = yaml.load(retrieval.location.path, contents, true);
        for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'object') {
                const startEnd = { start: val.__start, end: val.__end };
                const { __start, __end, ...cleanObj} = val;
                const request = new PlyRequest(key, { ...startEnd, ...cleanObj } as Request, logger, retrieval);
                suite.add(request);
            }
        }

        // mark if skipped
        if (this.skip?.isSkipped(suite.path)) {
            suite.skip = true;
        }

        return suite;
    }

    async loadSuite(retrieval: Retrieval): Promise<Suite<Request>> {
        const contents = await retrieval.read();
        if (!contents) {
            throw new Error('Cannot retrieve: ' + retrieval.location.absolute);
        }
        const resultPaths = await ResultPaths.create(this.options, retrieval);
        return this.buildSuite(retrieval, contents, resultPaths);
    }

    syncSuite(retrieval: Retrieval): Suite<Request> {
        const contents = retrieval.sync();
        if (!contents) {
            throw new Error('Cannot retrieve: ' + retrieval.location.absolute);
        }
        const resultPaths = ResultPaths.createSync(this.options, retrieval);
        return this.buildSuite(retrieval, contents, resultPaths);
    }
}