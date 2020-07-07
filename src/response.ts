import { Options } from './options';
import * as stringify from 'json-stable-stringify';

export interface Status {
    code: number;
    message: string;
}

export interface Response {
    status: Status;
    headers: any;
    body?: any;
    time?: number;
}

export class PlyResponse implements Response {

    readonly stringBody?: string;

    constructor(
        readonly status: Status,
        readonly headers: any,
        readonly body?: string,
        readonly time?: number) {

        this.stringBody = this.body = body;
        // convert body to object if exists and parseable
        if (body && body.startsWith('{')) {
            try {
                this.body = JSON.parse(body);
            } catch (err) {
                // can't be parsed -- leave as string
            }
        }
    }

    /**
     * Strips ignored headers and orders body object keys unless suppressed.
     */
    getResponse(options: Options): Response {
        const headerNames = Object.keys(this.headers).sort();
        const wanted = options.responseHeaders || headerNames;
        const headers: any = {};
        wanted.forEach(name => {
            headers[name.toLowerCase()] = this.headers[name];
        });

        let body = this.body;
        if (typeof body === 'object' && options.responseBodySortedKeys) {
            body = JSON.parse(stringify(body));
        }

        return {
            status: this.status,
            headers,
            body,
            time: this.time
        };
    }
}