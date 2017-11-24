import * as vscode from 'vscode';
import { swapTemplate } from './swap-template';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(...[
        vscode.commands.registerCommand('angular-template-swap.swap', swapTemplate)
    ]);
}
