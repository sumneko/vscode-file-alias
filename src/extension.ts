import * as path from 'path';
import { FileDecoration, RelativePattern, Uri, window, workspace } from 'vscode';

// hack VSCode
// @ts-ignore
FileDecoration.validate = () => {
    return true;
}

class FileAlias {
    private listFileMap: Map<string, Map<string, string>>;

    async watchListFile(wsUri: Uri, listFileUri: Uri) {
        let loadListFile = async () => {
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

        let watcher = workspace.createFileSystemWatcher(new RelativePattern(listFileUri, '*'));
        watcher.onDidChange(loadListFile);
        watcher.onDidCreate(loadListFile);
        watcher.onDidDelete(loadListFile);
        await loadListFile();
    }

    async getAlias(uri: Uri): Promise<string> {
        let map = this.listFileMap.get(workspace.getWorkspaceFolder(uri).uri.toString());
        if (!map) {
            return undefined;
        }
        return map.get(uri.toString());
    }

    constructor() {
        this.listFileMap = new Map();
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
        provideFileDecoration: async (uri: Uri): Promise<FileDecoration> => {
            let alias = await fileAlias.getAlias(uri)
            if (!alias) {
                return
            }
            return new FileDecoration(alias);
        },
    })
}
