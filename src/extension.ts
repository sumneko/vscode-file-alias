import * as path from 'path';
import { EventEmitter, FileDecoration, RelativePattern, Uri, window, workspace } from 'vscode';

// hack VSCode
// @ts-ignore
FileDecoration.validate = () => {
    return true;
}

class FileAlias {
    private listFileMap: Map<string, Map<string, string>>;
    onChange: EventEmitter<undefined | Uri | Uri[]>;

    async refreshAlians(...maps: Map<string, string>[]) {
        let uris: Uri[] = [];
        let mark = {};
        for (const map of maps) {
            for (const path of map.keys()) {
                let uri = Uri.parse(path);
                if (!mark[uri.toString()]) {
                    mark[uri.toString()] = true;
                    uris.push(uri);
                }
            }
        }
        this.onChange.fire(uris);
    }

    async watchListFile(wsUri: Uri, listFileUri: Uri) {
        let updateMap = async () => {
            this.listFileMap.delete(wsUri.toString());
            let listFile: string = (await workspace.fs.readFile(listFileUri))?.toString();
            if (!listFile) {
                return;
            }
            let json: Object;
            try {
                json = JSON.parse(listFile);
            } catch (e) {
                window.showErrorMessage((e as Error).message.replace('JSON', '`' + listFileUri.fsPath + '`'))
            }
            if (typeof json != 'object' || !json) {
                return;
            }
            let map: Map<string, string> = new Map();
            for (const key in json) {
                let uri = Uri.file(path.resolve(wsUri.fsPath, key))?.toString();
                if (typeof uri == 'string') {
                    map.set(uri, json[key]);
                }
            }
            this.listFileMap.set(wsUri.toString(), map);
        }
        let loadListFile = async () => {
            let oldMap = this.listFileMap.get(wsUri.toString());
            await updateMap();
            let newMap = this.listFileMap.get(wsUri.toString());
            this.refreshAlians(oldMap, newMap);
        }

        let watcher = workspace.createFileSystemWatcher(new RelativePattern(listFileUri, '*'));
        watcher.onDidChange(loadListFile);
        watcher.onDidCreate(loadListFile);
        watcher.onDidDelete(loadListFile);
        await loadListFile();
    }

    getAlias(uri: Uri): string {
        let map = this.listFileMap.get(workspace.getWorkspaceFolder(uri)?.uri?.toString());
        if (!map) {
            return undefined;
        }
        return map.get(uri.toString());
    }

    constructor() {
        this.listFileMap = new Map();
        this.onChange    = new EventEmitter();
    }
}

export async function activate() {
    let config    = workspace.getConfiguration('file-alias');
    let fileAlias = new FileAlias();

    if (workspace.workspaceFolders) {
        let listFile: string = config.get('listFile');
        for (let index = 0; index < workspace.workspaceFolders.length; index++) {
            const ws = workspace.workspaceFolders[index];
            let wsListFile = path.resolve(ws.uri.fsPath, listFile);
            await fileAlias.watchListFile(ws.uri, Uri.file(wsListFile));
        }
    }

    window.registerFileDecorationProvider({
        onDidChangeFileDecorations: fileAlias.onChange.event,
        provideFileDecoration: async (uri: Uri): Promise<FileDecoration> => {
            let alias = fileAlias.getAlias(uri)
            if (!alias) {
                return
            }
            return new FileDecoration(alias);
        },
    })
}
