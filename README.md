# File Alias

![avatar](https://github.com/sumneko/vscode-file-alias/raw/master/image/readme.jpg)

Display alias (or anything else) to the right of the file name

# Usage

## file-alias.listFile

Specify a list file (must be a valid json file), the key of json is the relative path of the file, and the value is the displayed alias.

The preview image above uses the following settings:

`"file-alias.listFile": "listfile.json"`

`listfile.json`
```json
{
    "24C8245F82CFCD04": "[Haru Urara]",
    "31EDAED9542FB1B1": "[Seiun Sky]",
    "769A76808677D175": "[Nishino Flower]",
    "4621C279794DBDFE": "[Mayano Top Gun]",
    "6867B34B31B2DD12": "[Rice Shower]"
}
```

## file-alias.contentMatch

Match a piece of content from the file content as an alias

`"file-alias.contentMatch": "// filename: (\\w+)"`

## file-alias.contentMatchFormat

Format the matched content

![avatar](https://github.com/sumneko/vscode-file-alias/raw/master/image/log-view.jpg)

![avatar](https://github.com/sumneko/vscode-file-alias/raw/master/image/log-content.jpg)

`"file-alias.contentMatch": "Compile (\\w+)"`

`"file-alias.contentMatchFormat": "<{1}>"`

# Note

VSCode's public API cannot achieve this feature, so this extension [did some hacks](https://github.com/sumneko/vscode-file-alias/blob/5b7b9841bc0f359ad1977959de8032e2d519eaaa/src/extension.ts#L8)
