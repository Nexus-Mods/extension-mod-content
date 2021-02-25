import { byTypeIndex, fileTypes, typeDescription, typeIndices } from './filetypes';
import ModContent from './ModContent';

import * as path from 'path';
import * as React from 'react';
import turbowalk from 'turbowalk';
import { actions, selectors, types, util } from 'vortex-api';
import { OptionsFilter } from 'vortex-api';

const readQueue = (util as any).makeQueue();

function compareArray(lhs: string[], rhs: string[]): number {
  const lSorted = lhs.map(i => i.toLowerCase()).sort(byTypeIndex);
  const rSorted = rhs.map(i => i.toLowerCase()).sort(byTypeIndex);

  for (let i = 0; i < Math.min(lSorted.length, rSorted.length); ++i) {
    if (lSorted[i] !== rSorted[i]) {
      return typeIndices[lSorted[i]] - typeIndices[rSorted[i]];
    }
  }

  return lSorted.length - rSorted.length;
}

function readModContent(stagingPath: string, gameId: string)
    : Promise<{ typesFound: string[], empty: boolean }> {
  const typesFound: Set<string> = new Set();
  let empty: boolean = true;
  return readQueue(() => {
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
    });
  }, false)
  .then(() => ({ typesFound: Array.from(typesFound), empty }));
}

function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}

function main(context: types.IExtensionContext) {
  context.requireVersion('>=0.19.0');
  const onUpdateContent = (gameId: string, modId: string, typesFound: string[], empty: boolean) => {
    context.api.store.dispatch(actions.setModAttribute(gameId, modId, 'content', typesFound));
    context.api.store.dispatch(actions.setModAttribute(gameId, modId, 'noContent', empty));
  };

  const updateContent = (state: types.IState, mod: types.IMod) => {
    const gameId = selectors.activeGameId(state);
    const stagingPath = selectors.installPath(state);
    if ((stagingPath === undefined)
        || (mod.installationPath === undefined)) {
      return;
    }
    onUpdateContent(gameId, mod.id, [], false);
    readModContent(path.join(stagingPath, mod.installationPath), gameId)
      .then(({ typesFound, empty }) => {
        onUpdateContent(gameId, mod.id, typesFound, empty);
      })
      .catch(err => {
        // this may happen while installing a mod
        if (!['ENOENT', 'ENOTFOUND'].includes(err.code)) {
          context.api.showErrorNotification('Failed to determine mod content', err);
        }
      });
  };

  context.registerTableAttribute('mods', {
    id: 'content',
    name: 'Content',
    description: 'Content',
    icon: 'inspect',
    placement: 'table',
    customRenderer: (mod: types.IMod) => {
      const state = context.api.store.getState();
      if ((mod.state === 'installed')
          && (util.getSafe(mod, ['attributes', 'content'], undefined) === undefined)
          && (mod.installationPath !== undefined)) {
        setTimeout(() => updateContent(state, mod), 0);
      }
      return <ModContent t={context.api.translate} mod={mod} />;
    },
    calc: (mod: types.IMod) => util.getSafe(mod, ['attributes', 'content'], []).map(capitalize),
    filter: new OptionsFilter(() =>
      [].concat([{ value: OptionsFilter.EMPTY, label: `<${context.api.translate('No Content')}>` }],
        Object
          .keys(typeDescription)
          .sort()
          .map(id => {
            const capId = capitalize(id);
            return { value: capId, label: context.api.translate(capId) };
          }))
        , true, false),
    isToggleable: true,
    edit: {},
    isSortable: true,
    isGroupable: true,
    isDefaultVisible: false,
    sortFunc: compareArray,
  } as any);

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
      if (mod !== undefined) {
        updateContent(state, mod);
      }
    });

    return (util as any).installIconSet('mod-content', path.join(__dirname, 'icons.svg'));
  });

  return true;
}

export default main;
