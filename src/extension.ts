import * as path from 'path';
import { ConfigurationChangeEvent, EventEmitter, FileDecoration, RelativePattern, Uri, window, workspace } from 'vscode';

// hack VSCode: src\vs\workbench\api\common\extHostTypes.ts:2913
// @ts-ignore
FileDecoration.validate = (d: FileDecoration): void => {
    if (d.badge && d.badge.length !== 1 && d.badge.length !== 2) {
        //throw new Error(`The 'badge'-property must be undefined or a short character`);
    }
    if (!d.color && !d.badge && !d.tooltip) {
        throw new Error(`The decoration is empty`);
    }
}

class FileAlias {
    private lfMap:   Map<string, string>;
    private visited: Map<string, boolean>;
    private uri:     Uri;
    private lfUri:   Uri;
    changeEmitter:   EventEmitter<undefined | Uri | Uri[]>;

    async getAliasByListFile(uri: Uri): Promise<string> {
        return this.lfMap.get(uri.toString());
    }

    async getAliasByContent(uri: Uri): Promise<string> {
        let pattern: string = workspace.getConfiguration('file-alias', this.uri).get('contentMatch');
        if (!pattern || pattern == '') { return undefined };

        let content: string;
        try {
            content = (await workspace.fs.readFile(uri))?.toString();
        } catch {};
        if (!content) { return undefined };

        let re = new RegExp(pattern);
        if (!re) { return undefined };

        let matchs = content.match(re);
        let name: string = matchs?.[1];

        return name;
    }

    async getDecoration(uri: Uri): Promise<FileDecoration> {
        this.visited.set(uri.toString(), true);
        let alias = await this.getAliasByListFile(uri)
                 || await this.getAliasByContent(uri);
        if (!alias) { return undefined };
        return new FileDecoration(alias);
    }

    async refreshVisited() {
        let uris: Uri[] = [];
        for (const suri of this.visited.keys()) {
            uris.push(Uri.parse(suri));
        }
        this.visited.clear();
        this.changeEmitter.fire(uris);
    }

    async refreshListFile() {
        this.lfMap.clear();

        let listFilePath: string = workspace.getConfiguration('file-alias', this.uri).get('listFile');
        if (!listFilePath || listFilePath == '') { return };
        this.lfUri = Uri.file(path.resolve(this.uri.fsPath, listFilePath));

        let listFile: string;
        try {
            listFile = (await workspace.fs.readFile(this.lfUri))?.toString();
        } catch (e) {
            window.showErrorMessage((e as Error).message);
        };
        if (!listFile) { return };

        let json: Object;
        try {
            json = JSON.parse(listFile);
        } catch (e) {
            window.showErrorMessage((e as Error).message.replace('JSON', '`' + this.lfUri.fsPath + '`'))
        }

        if (typeof json != 'object' || !json) { return };
        for (const key in json) {
            let uri = Uri.file(path.resolve(this.uri.fsPath, key));
            if (uri) {
                this.lfMap.set(uri.toString(), json[key]);
            }
        }
    }

    async fileWatcher(uri: Uri) {
        this.changeEmitter.fire(uri);
        if (uri.toString() == this.lfUri?.toString()) {
            await this.refreshListFile();
            this.refreshVisited();
        }
    }

    async initWorkSpace() {
        await this.refreshListFile();

        let watcher = workspace.createFileSystemWatcher(new RelativePattern(this.uri, '**/*'));
        watcher.onDidChange(this.fileWatcher, this);
        watcher.onDidCreate(this.fileWatcher, this);
        watcher.onDidDelete(this.fileWatcher, this);

        workspace.onDidChangeConfiguration(async (e: ConfigurationChangeEvent) => {
            if (e.affectsConfiguration('file-alias', this.uri)) {
                await this.refreshListFile();
                this.refreshVisited();
            }
        })

        window.registerFileDecorationProvider({
            onDidChangeFileDecorations: this.changeEmitter.event,
            provideFileDecoration:      async (uri: Uri): Promise<FileDecoration> => { return await this.getDecoration(uri) },
        })
    }

    constructor(uri: Uri) {
        this.uri           = uri;
        this.lfMap         = new Map();
        this.visited       = new Map();
        this.changeEmitter = new EventEmitter();
    }
}

export async function activate() {
    if (!workspace.workspaceFolders) { return };

    for (let index = 0; index < workspace.workspaceFolders.length; index++) {
        const ws = workspace.workspaceFolders[index];
        let fileAlias = new FileAlias(ws.uri);
        await fileAlias.initWorkSpace();
    }
}
