import * as path from 'path';
import { ConfigurationChangeEvent, EventEmitter, FileDecoration, RelativePattern, Uri, window, workspace } from 'vscode';

// hack VSCode
// @ts-ignore
FileDecoration.validate = () => {
    return true;
}

function convertMapKeysToArray<T>(map: Map<T, any>, array: Array<T> = []): Array<T> {
    let mark = {};
    for (const value of array) {
        mark[value.toString()] = true;
    }
    for (const value of map.keys()) {
        if (!mark[value.toString()]) {
            mark[value.toString()] = true;
            array.push(value);
        }
    }
    return array
}

class FileAlias {
    private lfMap: Map<Uri, string>;
    private uri:   Uri;
    private lfUri: Uri;
    changeEmitter: EventEmitter<undefined | Uri | Uri[]>;

    getAliasByListFile(uri: Uri): string {
        return this.lfMap.get(uri);
    }

    getAliasByContent(uri: Uri): string {
        return undefined;
    }

    getDecoration(uri: Uri): FileDecoration {
        let alias = this.getAliasByListFile(uri)
                 || this.getAliasByContent(uri);
        if (!alias) {
            return undefined;
        }
        return new FileDecoration(alias);
    }

    async updateMap() {
        let listFile: string = (await workspace.fs.readFile(this.lfUri))?.toString();
        if (!listFile) {
            return;
        }
        let json: Object;
        try {
            json = JSON.parse(listFile);
        } catch (e) {
            window.showErrorMessage((e as Error).message.replace('JSON', '`' + this.lfUri.fsPath + '`'))
        }
        if (typeof json != 'object' || !json) {
            return;
        }
        for (const key in json) {
            let uri = Uri.file(path.resolve(this.uri.fsPath, key));
            if (uri) {
                this.lfMap.set(uri, json[key]);
            }
        }
    }

    async refreshListFile() {
        let uris = convertMapKeysToArray(this.lfMap);
        this.lfMap.clear();
        try {
            await this.updateMap();
        } catch {};
        uris = convertMapKeysToArray(this.lfMap, uris);
        this.changeEmitter.fire(uris);
    }

    fileWatcher(uri: Uri) {
        this.changeEmitter.fire(uri);
        if (uri == this.lfUri) {
            this.refreshListFile();
        }
    }

    async initWorkSpace() {
        let listFile: string = workspace.getConfiguration('file-alias', this.uri).get('listFile', '');
        this.lfUri = Uri.file(path.resolve(this.uri.fsPath, listFile));

        let watcher = workspace.createFileSystemWatcher(new RelativePattern(this.uri, '**/*'));
        watcher.onDidChange((uri) => { this.fileWatcher(uri) });
        watcher.onDidCreate((uri) => { this.fileWatcher(uri) });
        watcher.onDidDelete((uri) => { this.fileWatcher(uri) });

        workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('file-alias', this.uri)) {
                this.refreshListFile();
            }
        })

        window.registerFileDecorationProvider({
            onDidChangeFileDecorations: this.changeEmitter.event,
            provideFileDecoration:      (uri: Uri): FileDecoration => { return this.getDecoration(uri) },
        })

        await this.refreshListFile();
    }

    constructor(uri: Uri) {
        this.uri      = uri;
        this.lfMap    = new Map();
        this.changeEmitter = new EventEmitter();
    }
}

export async function activate() {
    if (!workspace.workspaceFolders) {
        return;
    }

    for (let index = 0; index < workspace.workspaceFolders.length; index++) {
        const ws = workspace.workspaceFolders[index];
        let fileAlias = new FileAlias(ws.uri);
        await fileAlias.initWorkSpace();
    }
}
