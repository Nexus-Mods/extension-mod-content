import * as path from 'path';
import { IEntry } from 'turbowalk';

interface ITypeDescription {
  icon: string;
  tooltip: string;
}

export const typeDescription: { [id: string]: ITypeDescription } = {
  texture: { icon: 'texture', tooltip: 'Textures' },
  mesh: { icon: 'mesh', tooltip: 'Meshes' },
  plugin: { icon: 'plugin', tooltip: 'Game Plugins' },
  music: { icon: 'music', tooltip: 'Music & Sound' },
  interface: { icon: 'interface', tooltip: 'Interface' },
  archive: { icon: 'archive', tooltip: 'Asset Bundle' },
  shader: { icon: 'shader', tooltip: 'Graphics Shaders' },
  script: { icon: 'script', tooltip: 'Scripts' },
  config: { icon: 'config', tooltip: 'Configuration' },
  executable: { icon: 'executable', tooltip: 'Executable (Tools and such)' },
  extender: { icon: 'extender', tooltip: 'Extends modding capabilities' },
  map: { icon: 'map', tooltip: 'Game Map' },
  animation: { icon: 'animation', tooltip: 'Animations' },
};

interface IFileType {
  type: string;
  condition?: (gameId: string, entry: IEntry) => boolean;
}

const scriptExtenderGames = new Set([
  'oblivion', 'skyrim', 'skyrimse', 'skyrimvr',
  'fallout3', 'falloutnv', 'fallout4', 'fallout4vr',
]);

function supportsScriptExtender(gameId: string): boolean {
  return scriptExtenderGames.has(gameId);
}

const gamesUsingPythonScripting = new Set([
  'thesims4',
]);

const gamesUsingDLLPlugins = new Set([
  'stardewvalley',
]);

const gamesUsingImagesAsTextures = new Set([
  'stardewvalley', 'darksouls2',
]);

export const fileTypes: { [ext: string]: IFileType[] } = {
  '.dds': [{ type: 'texture' }],
  '.nif': [{ type: 'mesh' }],
  '.exe': [{ type: 'executable' }],
  '.bat': [{ type: 'executable' }],
  '.cmd': [{ type: 'executable' }],
  '.jar': [{ type: 'executable' }],
  '.py': [{ type: 'executable', condition: gameId => !gamesUsingPythonScripting.has(gameId) },
          { type: 'script', condition: gameId => gamesUsingPythonScripting.has(gameId) }],

  '.swf': [{ type: 'interface' }],
  '.xml': [{ type: 'config' }],
  '.json': [{ type: 'config',
              condition: (gameId, entry) => path.basename(entry.filePath) !== 'manifest.json' }],
  '.ini': [{ type: 'config' }],

  '.wav': [{ type: 'music' }],
  '.mp3': [{ type: 'music' }],
  '.ogg': [{ type: 'music' }],

  '.png': [{ type: 'texture', condition: gameId => gamesUsingImagesAsTextures.has(gameId) }],
  '.jpg': [{ type: 'texture', condition: gameId => gamesUsingImagesAsTextures.has(gameId) }],
  '.tga': [{ type: 'texture' }],

  '.unity3d': [{ type: 'archive' }],
  '.arc': [{ type: 'archive' }],

  // gamebryo formats
  '.xwm': [{ type: 'music' }],
  '.bsa': [{ type: 'archive' }],
  '.ba2': [{ type: 'archive' }],
  '.esp': [{ type: 'plugin' }],
  '.esm': [{ type: 'plugin' }],
  '.esl': [{ type: 'plugin' }],
  '.pex': [{ type: 'script' }],
  '.dll': [{ type: 'extender', condition: supportsScriptExtender },
           { type: 'plugin', condition: gameId => gamesUsingDLLPlugins.has(gameId) }],

  // sims 4
  '.ts4script': [{ type: 'script' }],
  '.package': [{ type: 'archive' }],
  '.bpi': [{ type: 'plugin' }],
  '.blueprint': [{ type: 'plugin' }],
  '.trayitem': [{ type: 'plugin' }],
  '.sfx': [{ type: 'music' }],
  '.ion': [{ type: 'plugin' }],
  '.householdbinary': [{ type: 'plugin' }],
  '.sgi': [{ type: 'plugin' }],
  '.hhi': [{ type: 'plugin' }],
  '.room': [{ type: 'plugin' }],
  '.midi': [{ type: 'music' }],
  '.rmi': [{ type: 'plugin' }],

  // Stardew Valley
  '.tbin': [{ type: 'textures' }], // actually tilesets

  // Neverwinter Nights
  '.mod': [{ type: 'plugin' }],
  '.hak': [{ type: 'archive' }],
  '.bmu': [{ type: 'music' }],

  // Dragon Age
  '.ani': [{ type: 'animation' }],
};
