/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	ProposedFeatures,
	InitializeParams,
	InitializeResult
} from 'vscode-languageserver/node';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

connection.onInitialize((params: InitializeParams) => {
	const result: InitializeResult = {
		capabilities: {
			workspace: {
				fileOperations: {
					didDelete: {
						filters: [
							{
								pattern: {
									glob: '**',
									matches: 'file',
								}
							}
						]
					}
				}
			}
		}
	};
	return result;
});

connection.onInitialized(() => {});

// Listen on the connection
connection.listen();
