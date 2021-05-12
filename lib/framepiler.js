'use babel';

import { CompositeDisposable, Disposable } from 'atom';
import { exec } from 'child_process';
import * as axios from 'axios';
import { normalize } from 'path';
import { platform } from 'os';

import { encode64 } from './commonFunc';
import * as rawdeflate from './rawdeflate';

let MarkdownPreviewView = null;
let stateData = {
  editorData: null,
  plantUmlUrl: null,
  currentlanguage: 'PlantUml'
};

export default {

  subscriptions: null,
  output: null,
  config: {
    languageArr: {
      title: 'Supported Languages Array',
      type: 'array',
      default: ['PlantUml', 'C++', 'C#', 'GDScript32', 'Java_8', 'JavaScript', 'Python'],
      description: 'Array of all the supported languages. Used to traverse next and previous target languages'
    },
    framepilerURI: {
      title: 'Framepiler URI',
      type: 'string',
      default: 'framepiler://editor',
      description: 'URI of the pane which open as a preview'
    },
    framec: {
      title: 'Framec path',
      type: 'string',
      default: normalize(`${__dirname}/../framec/${platform()}/framec`),
      description: 'The path of framec executable depending upon the OS platform'
    },
    saveEnabledOn: {
      title: 'Save event enabled editors',
      type: 'array',
      default: [],
      description: ' IDs of text editors where save event is registered'
    },
  },

  activate(state) {
    this.subscriptions = new CompositeDisposable();

    // Register commands
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:UML': () => this.framepile('PlantUml')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:C++': () => this.framepile('C++')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:C#': () => this.framepile('C#')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:GDScript': () => this.framepile('GDScript32')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:Java': () => this.framepile('Java_8')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:JavaScript': () => this.framepile('JavaScript')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:Python': () => this.framepile('Python')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:reload': () => this.framepile(stateData.currentlanguage)
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:nextTarget': () => {
        const languageArr = atom.config.get('framepiler.languageArr');
        const currentIndex = languageArr.indexOf(stateData.currentlanguage);
        const nextIndex = (currentIndex + 1) % languageArr.length;
        this.framepile(languageArr[nextIndex]);
      }
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'framepiler:previousTarget': () => {
        const languageArr = atom.config.get('framepiler.languageArr');
        const currentIndex = languageArr.indexOf(stateData.currentlanguage);
        const nextIndex = currentIndex === 0 ? (languageArr.length -1) : (currentIndex - 1);
        this.framepile(languageArr[nextIndex]);
      }
    }));

    this.subscriptions.add(atom.workspace.addOpener(uri => {
      let [protocol, path] = uri.split('://')
      if (protocol !== 'framepiler') return;
      if (path.startsWith('editor')) return this.createFramepilerView(stateData);
    }));

    this.subscriptions.add(new Disposable(async () => {
      await this.removePreviewForEditor()
    }))

    this.restoreSaveEvent();
  },

  async framepile(language) {
    stateData.currentlanguage = language;
    const editor = atom.workspace.getActiveTextEditor();
    const frameSpecLocation = editor.getPath();
    stateData.plantUmlUrl = null;

    // Handle unsaved files
    if (!frameSpecLocation) {
      return this.showError('Unsaved file', `Framepiler is only for Frames Spec. The files saved with '.frm' extention.`);
    }
    // Check extension (must be frm)
    const pathArr = frameSpecLocation.split('.');
    if (pathArr[pathArr.length - 1] !== 'frm') {
      return this.showError('Not a Frame specification file', `Framepiler is only for Frames Spec. The files saved with '.frm' extention.`);
    }
    // Add save event,so view will reload when save (Add event only once)
    this.addSaveEvent(editor);

    exec(`${atom.config.get('framepiler.framec')} ${frameSpecLocation} ${language}`, async (error, stdout, stderr) => {
      try {
        if (error) {
            return this.showError('Error while Frampiling', error.message);
        }
        if (stderr) {
            return this.showError('Error while Frampiling', stderr);
        }
        if (stdout.indexOf('Terminating with errors') >= 0) {
          return this.showError('Error in Frame Specification', null, stdout);
        }
        if (language === 'PlantUml') {
          const encodedData = unescape(encodeURIComponent(stdout)); //UTF8
          const url = `https://www.plantuml.com/plantuml/img/${encode64(rawdeflate.deflate(encodedData, 9))}`;
          const response = await axios.get(url);
          stateData.plantUmlUrl = response.config.url;
        }
        stateData.editorData = stdout;
        await this.removePreviewForEditor();
        this.addPreviewForEditor();
      } catch (err) {
        this.showError('Error while loading UML', 'There is an error occurred while fetching the UML');
      }
    });
  },

  addPreviewForEditor () {
    const previousActivePane = atom.workspace.getActivePane();
    const options = {
      searchAllPanes: true,
      split: 'right'
    };
    return atom.workspace
      .open(atom.config.get('framepiler.framepilerURI'))
      .then( (markdownPreviewView) => {
        previousActivePane.activate();
      })
  },

  async removePreviewForEditor () {
    if (MarkdownPreviewView == null) return;
    const previewPane = atom.workspace.paneForURI(atom.config.get('framepiler.framepilerURI'));
    if (previewPane) { // Not available when framepiler pane is manually closed
      await previewPane.destroyItem(previewPane.itemForURI(atom.config.get('framepiler.framepilerURI')));
    }
  },

  createFramepilerView (state) {
    stateData = state;
    if (MarkdownPreviewView === null) {
      MarkdownPreviewView = require('./framepiler-view');
    }
    return new MarkdownPreviewView(state);
  },

  async showError (message, description, detail) {
    await this.removePreviewForEditor();
    atom.notifications.addError(message, {
      dismissable: true,
      ...description && {description},
      ...detail && {detail}
    });
  },

  addSaveEvent (editor) {
    const saveEnabledOn = atom.config.get('framepiler.saveEnabledOn');
    if (saveEnabledOn.indexOf(editor.id) === -1) {
      saveEnabledOn.push(editor.id);
      atom.config.set('framepiler.saveEnabledOn', saveEnabledOn);
      editor.onDidSave((event) => {
        this.framepile(stateData.currentlanguage);
      })
      editor.onDidDestroy((event) => {
        this.removeSaveEvent(editor.id);
      })
    }
  },

  restoreSaveEvent () {
    const saveEnabledOn = atom.config.get('framepiler.saveEnabledOn');
    atom.workspace.getTextEditors().forEach((editor) => {
      if (saveEnabledOn.indexOf(editor.id) >= 0) {
        editor.onDidSave((event) => {
          this.framepile(stateData.currentlanguage);
        })
        editor.onDidDestroy((event) => {
          this.removeSaveEvent(editor.id);
        })
      }
    });
  },

  removeSaveEvent (editorId) {
    const saveEnabledOn = atom.config.get('framepiler.saveEnabledOn');
    const removeIndex = saveEnabledOn.indexOf(editorId);
    saveEnabledOn.splice(removeIndex, 1);
    atom.config.set('framepiler.saveEnabledOn', saveEnabledOn);
    console.log("atom.config.get('framepiler.saveEnabledOn')", atom.config.get('framepiler.saveEnabledOn'));
  },

  deactivate() {
    this.subscriptions.dispose();
  }
};
