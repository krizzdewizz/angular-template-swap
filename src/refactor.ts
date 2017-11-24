import * as ts from 'typescript';
import * as vs from 'vscode';

export function getTabs(editor: vs.TextEditor, nTabs: number): string {
    return (editor.options.insertSpaces ? ' ' : '\t').repeat(Number(editor.options.tabSize) * nTabs);
}

export function selectionToSpan(doc: vs.TextDocument, sel: vs.Selection): ts.TextSpan {
    return { start: doc.offsetAt(sel.start), length: doc.offsetAt(sel.end) - doc.offsetAt(sel.start) };
}

export function changeToRange(doc: vs.TextDocument, change: ts.TextChange): vs.Range {
    return new vs.Range(doc.positionAt(change.span.start), doc.positionAt(change.span.start + change.span.length));
}

export function findChildOfKind(node: ts.Node, kind: ts.SyntaxKind): ts.Node {
    return node.getChildren().find(it => it.kind === kind);
}

export function createSourceFileFromActiveEditor(): { editor: vs.TextEditor, sourceFile: ts.SourceFile } {
    const editor = vs.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }
    const doc = editor.document;
    const sourceFile = ts.createSourceFile(doc.fileName, doc.getText(), ts.ScriptTarget.Latest, true);
    return { editor, sourceFile };
}

export function childrenOf(node: ts.Node): ts.Node[] {
    const all = [];
    ts.forEachChild(node, it => {
        all.push(it);
    });
    return all;
}