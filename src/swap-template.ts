import * as vscode from 'vscode';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { createSourceFileFromActiveEditor } from './refactor';

const templatePrefix = 'template: ';
const templateUrlPrefix = 'templateUrl: ';

const tsSuffix = '.ts';

function toHtmlFile(fileFull: string): string {
    return fileFull.substring(0, fileFull.length - tsSuffix.length) + '.html';
}

function findPropAss(source: ts.SourceFile, propName: string): ts.PropertyAssignment {
    let propAss: ts.PropertyAssignment;

    visitor(source);

    function visitor(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.Decorator) {

            const dec = node as ts.Decorator;
            if (dec.expression.kind === ts.SyntaxKind.CallExpression) {
                const ce = dec.expression as ts.CallExpression;
                const first = ce.arguments[0];
                if (first && first.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                    const ole = first as ts.ObjectLiteralExpression;
                    ole.properties.find(prop => {
                        if (prop.kind === ts.SyntaxKind.PropertyAssignment) {
                            const pa = prop as ts.PropertyAssignment;
                            const name = pa.name.getText();
                            const found = name === propName;
                            if (found) {
                                propAss = prop as ts.PropertyAssignment;
                            }
                            return found;
                        }
                        return false;
                    });
                }
            }
        }

        if (!propAss) {
            ts.forEachChild(node, visitor);
        }
    }

    return propAss;
}

function replacePropAss(propAss: ts.PropertyAssignment, initRange: vscode.Range, newName: string, newContent: string, doc: vscode.TextDocument, builder: vscode.TextEditorEdit) {
    const name = propAss.name;
    builder.replace(new vscode.Range(doc.positionAt(name.pos), doc.positionAt(name.end)), `\n\t${newName}`);
    builder.replace(initRange, newContent);
}

function getInitializer(propAss: ts.PropertyAssignment, doc: vscode.TextDocument): { initRange: vscode.Range, initContent: string } {
    const init = propAss.initializer;
    const initRange = new vscode.Range(doc.positionAt(init.pos), doc.positionAt(init.end));
    const initText = doc.getText(initRange).trim();
    const initContent = initText.substring(1, initText.length - 1);
    return { initRange, initContent };
}

function outlineTemplate(file: string, doc: vscode.TextDocument, builder: vscode.TextEditorEdit): void {

    const source = createSourceFileFromActiveEditor();

    const propAss = findPropAss(source.sourceFile, 'template');

    if (!propAss) {
        return;
    }

    const { initRange, initContent } = getInitializer(propAss, doc);

    const htmlFile = toHtmlFile(file);
    const local = './' + path.basename(htmlFile);

    fs.writeFileSync(htmlFile, initContent);

    replacePropAss(propAss, initRange, 'templateUrl', ` '${local}'`, doc, builder);
}

function inlineTemplate(file: string, doc: vscode.TextDocument, builder: vscode.TextEditorEdit): void {

    const source = createSourceFileFromActiveEditor();

    const propAss = findPropAss(source.sourceFile, 'templateUrl');

    if (!propAss) {
        return;
    }

    const { initRange, initContent } = getInitializer(propAss, doc);

    const htmlFileRelative = initContent;

    const htmlFile = path.join(path.dirname(file), htmlFileRelative);
    const html = fs.readFileSync(htmlFile);

    if (fs.existsSync(htmlFile)) {
        fs.unlinkSync(htmlFile);
    }

    replacePropAss(propAss, initRange, 'template', ' `' + html + '`', doc, builder);
}

export function swapTemplate() {

    const ed = vscode.window.activeTextEditor;
    const doc = ed.document;
    const fileName = doc.fileName;

    if (!fileName.endsWith(tsSuffix)) {
        return;
    }

    const text = doc.getText();
    if (!text.includes('@Component')) {
        return;
    }

    try {
        ed.edit(builder => {
            if (text.includes(templateUrlPrefix)) {
                inlineTemplate(fileName, doc, builder);
            } else if (text.includes(templatePrefix)) {
                outlineTemplate(fileName, doc, builder);
            }
        });
    } catch (err) {
        console.log('error in swap-template', err);
        throw err;
    }
}