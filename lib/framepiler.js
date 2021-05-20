'use babel';

import { CompositeDisposable, Disposable } from 'atom';
import { exec } from 'child_process';
import * as axios from 'axios';
import { normalize } from 'path';
import { platform } from 'os';

import { encode64 } from './commonFunc';
import * as rawdeflate from './rawdeflate';

let FramepilerView = null;
let currentEditorId = null;
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
      let [protocol, path] = uri.split('://');
      if (protocol !== 'framepiler') return;
      if (path.startsWith('editor')) return this.createFramepilerView(stateData);
    }));

    this.subscriptions.add(atom.workspace.getCenter().observeActivePaneItem( async (item) => {
      await this.switchEditor(item);
    }));

    this.subscriptions.add(new Disposable(async () => {
      await this.removeFramepiler();
    }))

    this.restoreSaveEvent();
  },

  checkError(frameSpecLocation) {
    const errData = {
      errMsg: null,
      errDescription: null
    };
    // Handle unsaved files
    if (!frameSpecLocation) {
      errData['errMsg'] = 'Unsaved file';
      errData['errDescription'] = `Framepiler is only for Frames Spec. The files saved with '.frm' extention.`;
      return errData;
    }
    // Check extension (must be frm)
    const pathArr = frameSpecLocation.split('.');
    if (pathArr[pathArr.length - 1] !== 'frm') {
      errData['errMsg'] = 'Not a Frame specification file';
      errData['errDescription'] = `Framepiler is only for Frames Spec. The files saved with '.frm' extention.`;
    }
    return errData;
  },

  async framepile(language) {
    stateData.currentlanguage = language;
    const editor = atom.workspace.getActiveTextEditor();
    currentEditorId = editor.id;
    const frameSpecLocation = editor.getPath();
    stateData.plantUmlUrl = null;
    const {errMsg, errDescription} = this.checkError(frameSpecLocation);
    if (errMsg && errDescription) {
      return this.showError(errMsg, errDescription);
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
        await this.removeFramepiler();
        this.addFramepiler();
      } catch (err) {
        this.showError('Error while loading UML', 'There is an error occurred while fetching the UML', err);
      }
    });
  },

  async addFramepiler () {
    const previousActivePane = atom.workspace.getActivePane();
    await atom.workspace.open(atom.config.get('framepiler.framepilerURI'), {split: 'right'});
    previousActivePane.activate();
  },

  async removeFramepiler () {
    if (FramepilerView == null) return;
    const previewPane = atom.workspace.paneForURI(atom.config.get('framepiler.framepilerURI'));
    if (previewPane) { // Not available when framepiler pane is manually closed
      await previewPane.destroyItem(previewPane.itemForURI(atom.config.get('framepiler.framepilerURI')));
    }
  },

  createFramepilerView (state) {
    stateData = state;
    if (FramepilerView === null) {
      FramepilerView = require('./framepiler-view');
    }
    return new FramepilerView(state);
  },

  async switchEditor(item) {
    if (!atom.workspace.isTextEditor(item) || FramepilerView == null || item.id === currentEditorId) {
          return;
    }
    currentEditorId = item.id;
    const frameSpecLocation = item.getPath();
    const {errMsg, errDescription} = this.checkError(frameSpecLocation);
    if (errMsg && errDescription) {
      return await this.removeFramepiler();
    }
    this.framepile(stateData.currentlanguage);
  },

  async showError (message, description, detail) {
    await this.removeFramepiler();
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
  },

  deactivate() {
    this.subscriptions.dispose();
  }
};
