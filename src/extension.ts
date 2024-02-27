// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// needed to install @types/node-fetch@2 because v3 is converted to an ECMA script
import fetch from 'node-fetch';
import { access } from 'fs';
import { GitExtension, Repository, API } from './git';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vela" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json



	const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;

	if (gitExtension !== undefined) {
		const git = gitExtension.getAPI(1);
		// console.log(git.getRepository(editor.document.uri));
	}

	// todo: this should be some kind of extension initialization when the extension is activated
	const pat = vscode.workspace.getConfiguration('vela').get('token_pat') as string;
	const velaServer = vscode.workspace.getConfiguration('vela').get('server');

	let accessToken = '';

	(async () => {
		const secrets = context['secrets'];
		accessToken = await secrets.get('access_token') || '' as string; //Get a secret

		console.log("using secrets.access_token: " + accessToken);

		if (accessToken !== undefined && accessToken.length === 0) {
			vscode.window.showInformationMessage('no access token found in secrets');
		}
	})();

	let disposable = vscode.commands.registerCommand('vela.getCurrentStatus', () => {
		// todo: if we have a vela token already AND it has not yet expired, then skip this portion
		(async () => {
			const response = await fetch(velaServer + '/authenticate/token', {
				method: 'post',
				body: JSON.stringify({}),
				headers: { 'Token': pat }
			});
			const data = await response.json();
			accessToken = data.token;

			vscode.window.showInformationMessage('exchanged PAT for access token: ' + accessToken);

			const secrets = context['secrets'];
			await secrets.store('access', 'value');

			// todo: if we have a vela token already AND it has not yet expired, then skip this portion
			(async () => {
				const response = await fetch(velaServer + '/api/v1/repos/DavidVader/heyvela/builds', {
					method: 'get',
					headers: { 'Authorization': accessToken }
				});

				const data = await response.json();

				// todo: nil check, length check, dont panic here when builds are bad or there are zero
				let build = data[0];

				const buildStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);

				// actually get the build status from the api 
				buildStatus.text = '$(gift) - ' + build.status;
				buildStatus.show();
			})();
		})();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
