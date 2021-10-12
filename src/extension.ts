import { FileDecoration, Uri, window } from 'vscode';

// hack VSCode
// @ts-ignore
FileDecoration.validate = () => {
    return true;
}

class FileAlias {
    async provideFileDecoration(uri: Uri): Promise<FileDecoration> {
        let fd = new FileDecoration(uri.toString())
        return fd
    }
}

export function activate() {
    let fileAlias = new FileAlias();
    window.registerFileDecorationProvider({
        provideFileDecoration: fileAlias.provideFileDecoration,
    })
}
