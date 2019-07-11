import { fileTypes } from './filetypes';
import ModContent from './ModContent';

import * as path from 'path';
import * as React from 'react';
import turbowalk from 'turbowalk';
import { actions, selectors, types, util } from 'vortex-api';

function readModContent(stagingPath: string, gameId: string)
    : Promise<{ typesFound: string[], empty: boolean }> {
  const typesFound: Set<string> = new Set();
  let empty: boolean = true;
  return turbowalk(stagingPath, entries => {
    if (empty && (entries.find(iter => !iter.isDirectory) !== undefined)) {
      empty = false;
    }
    entries.forEach(entry => {
      const ext = path.extname(entry.filePath).toLowerCase();
      const possibleTypes = fileTypes[ext] || [];
      const ft = possibleTypes.find(iter =>
        (iter.condition === undefined) || iter.condition(gameId, entry));
      if (ft !== undefined) {
        typesFound.add(ft.type);
      }
    });
  })
  .then(() => ({ typesFound: Array.from(typesFound), empty }));
}

function main(context: types.IExtensionContext) {
  context.requireVersion('>0.18.13');
  const onUpdateContent = (gameId: string, modId: string, typesFound: string[], empty: boolean) => {
    context.api.store.dispatch(actions.setModAttribute(gameId, modId, 'content', typesFound));
    context.api.store.dispatch(actions.setModAttribute(gameId, modId, 'noContent', empty));
  };

  const updateContent = (state: types.IState, mod: types.IMod) => {
    const gameId = selectors.activeGameId(state);
    const stagingPath = selectors.installPath(state);
    onUpdateContent(gameId, mod.id, [], false);
    readModContent(path.join(stagingPath, mod.installationPath), gameId)
      .then(({ typesFound, empty }) => {
        onUpdateContent(gameId, mod.id, typesFound, empty);
      })
      .catch(err => {
        context.api.showErrorNotification('Failed to determine mod content', err);
      });
  };

  context.registerTableAttribute('mods', {
    id: 'modContent',
    name: 'Content',
    description: 'Content',
    icon: 'inspect',
    placement: 'table',
    customRenderer: (mod: types.IMod) => {
      const state = context.api.store.getState();
      if ((util.getSafe(mod, ['attributes', 'content'], undefined) === undefined)
          && (mod.installationPath !== undefined)) {
        updateContent(state, mod);
      }
      return <ModContent t={context.api.translate} mod={mod} />;
    },
    calc: (mod: types.IMod) => util.getSafe(mod.attributes, ['content'], []),
    isToggleable: true,
    edit: {},
    isSortable: true,
    isDefaultVisible: false,
  });

  const refreshContent = (instanceIds: string[]) => {
    const state = context.api.store.getState();
    const gameId = selectors.activeGameId(state);
    instanceIds.forEach(instanceId => {
      const mod = util.getSafe(state.persistent.mods, [gameId, instanceId], undefined);
      if (mod !== undefined) {
        updateContent(state, mod);
      }
    });
  };

  context.registerAction('mods-action-icons', 200, 'refresh', {},
                         'Refresh Content', refreshContent);

  context.registerAction('mods-multirow-actions', 200, 'refresh', {},
                         'Refresh Content', refreshContent);

  context.once(() => {
    context.api.setStylesheet('mod-content', path.join(__dirname, 'mod-content.scss'));

    context.api.events.on('mod-content-changed', (gameId: string, modId: string) => {
      const state = context.api.store.getState();
      const mod = util.getSafe(state.persistent.mods, [gameId, modId], undefined);
      updateContent(state, mod);
    });

    return (util as any).installIconSet('mod-content', path.join(__dirname, 'icons.svg'));
  });

  return true;
}

export default main;
