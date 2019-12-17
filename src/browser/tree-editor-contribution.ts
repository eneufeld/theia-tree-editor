/********************************************************************************
 * Copyright (c) 2019 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0, or the MIT License which is
 * available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: EPL-2.0 OR MIT
 ********************************************************************************/
import {
    Command,
    CommandContribution,
    CommandHandler,
    CommandRegistry,
    MenuContribution,
    MenuModelRegistry,
} from '@theia/core';
import { WidgetOpenHandler } from '@theia/core/lib/browser';

import { TreeEditor } from './interfaces';
import { JsonFormsTreeEditorWidget } from './tree-editor-widget';
import { JsonFormsTreeAnchor, JsonFormsTreeContextMenu } from './tree-widget';
import { generateAddCommands } from './util';

export abstract class JsonFormsTreeEditorContribution extends WidgetOpenHandler<JsonFormsTreeEditorWidget> implements CommandContribution, MenuContribution {
    private commandMap: Map<string, Map<string, Command>>;

    constructor(private modelService: TreeEditor.ModelService, private labelProvider: TreeEditor.LabelProvider) {
        super();
    }
    /**
     * @returns maps property name to EClass identifiers to their corresponding add command
     */
    private getCommandMap(): Map<string, Map<string, Command>> {
        if (!this.commandMap) {
            this.commandMap = generateAddCommands(this.modelService);
        }
        return this.commandMap;
    }
    registerCommands(commands: CommandRegistry): void {
        this.getCommandMap().forEach((value, property, _map) => {
            value.forEach((command, eClass) => commands.registerCommand(command, new AddCommandHandler(property, eClass, this.modelService)));
        });
    }
    registerMenus(menus: MenuModelRegistry): void {
        this.getCommandMap().forEach((value, _property, _map) => {
            value.forEach((command, eClass) => {
                menus.registerMenuAction(JsonFormsTreeContextMenu.ADD_MENU, {
                    commandId: command.id,
                    label: command.label,
                    icon: this.labelProvider.getIconClass(eClass)
                });
            });
        });
    }
}

class AddCommandHandler implements CommandHandler {

    constructor(
        private readonly property: string,
        private readonly type: string,
        private modelService: TreeEditor.ModelService) {
    }

    execute(treeAnchor: JsonFormsTreeAnchor) {
        treeAnchor.onClick(this.property, this.type);
    }

    isVisible(treeAnchor: JsonFormsTreeAnchor): boolean {
        if (!treeAnchor) {
            return false;
        }
        return this.modelService.getChildrenMapping().get(treeAnchor.node.jsonforms.type)
            .map(desc => desc.children)
            .reduce((acc, val) => acc.concat(val), [])
            .reduce((acc, val) => acc.add(val), new Set<string>())
            .has(this.type);
    }
}
