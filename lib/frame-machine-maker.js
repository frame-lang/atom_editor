'use babel';

import { CompositeDisposable, Disposable } from 'atom';
import { exec } from 'child_process';
import * as axios from 'axios';
import { normalize } from 'path';
import { platform } from 'os';

import { encode64, emptyUML } from './commonFunc';
import * as rawdeflate from './rawdeflate';

let FrameMachineMakerView = null;
let currentEditorId = null;
let stateData = {
  editorData: null,
  plantUmlUrl: null,
  currentlanguage: 'PlantUml'
};
const view = {
  isOpened: false,
  temporarilyClosed: false
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
    frameMachineMakerURI: {
      title: 'Frame Machine Maker URI',
      type: 'string',
      default: 'frame-machine-maker://editor',
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
      'frame-machine-maker:UML': () => this.framepile('PlantUml')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:C++': () => this.framepile('C++')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:C#': () => this.framepile('C#')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:GDScript': () => this.framepile('GDScript32')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:Java': () => this.framepile('Java_8')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:JavaScript': () => this.framepile('JavaScript')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:Python': () => this.framepile('Python')
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:reload': () => this.framepile(stateData.currentlanguage)
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:nextTarget': () => {
        const languageArr = atom.config.get('frame-machine-maker.languageArr');
        const currentIndex = languageArr.indexOf(stateData.currentlanguage);
        const nextIndex = (currentIndex + 1) % languageArr.length;
        this.framepile(languageArr[nextIndex]);
      }
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'frame-machine-maker:previousTarget': () => {
        const languageArr = atom.config.get('frame-machine-maker.languageArr');
        const currentIndex = languageArr.indexOf(stateData.currentlanguage);
        const nextIndex = currentIndex === 0 ? (languageArr.length -1) : (currentIndex - 1);
        this.framepile(languageArr[nextIndex]);
      }
    }));

    this.subscriptions.add(atom.workspace.addOpener(uri => {
      let [protocol, path] = uri.split('://');
      if (protocol !== 'frame-machine-maker') return;
      if (path.startsWith('editor')) return this.createView(stateData);
    }));

    this.subscriptions.add(atom.workspace.getCenter().observeActivePaneItem( async (item) => {
      await this.switchEditor(item);
    }));

    this.subscriptions.add(new Disposable(async () => {
      await this.destroyView();
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
      errData['errDescription'] = `Frame Machine Maker is only for Frames Spec. The files saved with '.frm' extention.`;
      return errData;
    }
    // Check extension (must be frm)
    const pathArr = frameSpecLocation.split('.');
    if (pathArr[pathArr.length - 1] !== 'frm') {
      errData['errMsg'] = 'Not a Frame specification file';
      errData['errDescription'] = `Frame Machine Maker is only for Frames Spec. The files saved with '.frm' extention.`;
    }
    return errData;
  },

  async framepile(language) {
    stateData.currentlanguage = language;
    stateData.editorData = null;
    stateData.plantUmlUrl = null;
    const editor = atom.workspace.getActiveTextEditor();
    if (!editor || (editor && !editor.id)) return;
    currentEditorId = editor.id;
    const frameSpecLocation = editor.getPath();
    stateData.plantUmlUrl = null;
    const {errMsg, errDescription} = this.checkError(frameSpecLocation);
    if (errMsg && errDescription) {
      return this.showError(errMsg, errDescription);
    }

    // Add save event,so view will reload when save (Add event only once)
    this.addSaveEvent(editor);

    // Empty Frame Spec case
    if (editor.isEmpty()) {
      await this.destroyView();
      this.openView();
      return;
    }

    exec(`${atom.config.get('frame-machine-maker.framec')} ${frameSpecLocation} ${language}`, async (error, stdout, stderr) => {
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
        if (stdout.indexOf('Line ') >= 0) {
          return this.showError('Error in Frame Specification', null, null);
        }
        if (language === 'PlantUml' && stdout !== emptyUML) {
          const encodedData = unescape(encodeURIComponent(stdout)); //UTF8
          const url = `https://www.plantuml.com/plantuml/img/${encode64(rawdeflate.deflate(encodedData, 9))}`;
          const response = await axios.get(url);
          stateData.plantUmlUrl = response.config.url;
        }
        stateData.editorData = stdout;
        await this.destroyView();
        this.openView();
      } catch (err) {
        this.showError('Error while loading UML', 'There is an error occurred while fetching the UML', err);
      }
    });
  },

  async openView () {
    const previousActivePane = atom.workspace.getActivePane();
    await atom.workspace.open(atom.config.get('frame-machine-maker.frameMachineMakerURI'), {split: 'right'});
    view.isOpened = true;
    previousActivePane.activate();
  },

  async destroyView () {
    if (view.isOpened == null) return;
    const previewPane = atom.workspace.paneForURI(atom.config.get('frame-machine-maker.frameMachineMakerURI'));
    if (previewPane) { // Not available when frame-machine-maker pane is manually closed
      await previewPane.destroyItem(previewPane.itemForURI(atom.config.get('frame-machine-maker.frameMachineMakerURI')));
    }
  },

  createView (state) {
    stateData = state;
    if (FrameMachineMakerView === null) {
      FrameMachineMakerView = require('./frame-machine-maker-view');
    }
    return new FrameMachineMakerView(state);
  },

  async switchEditor(item) {
    view.isOpened = (atom.workspace.paneForURI(atom.config.get('frame-machine-maker.frameMachineMakerURI')) || view.temporarilyClosed) ? true : false;
    view.temporarilyClosed = false;
    if (!item || !view.isOpened || item instanceof FrameMachineMakerView || (item && item.id && item.id === currentEditorId)) {
      return;
    }
    if (!atom.workspace.isTextEditor(item)) {
      this.destroyView();
      view.temporarilyClosed = true;
      currentEditorId = -1;
      return;
    }
    currentEditorId = item.id;
    const frameSpecLocation = item.getPath();
    const {errMsg, errDescription} = this.checkError(frameSpecLocation);
    if (errMsg && errDescription) {
      return await this.destroyView();
    }
    this.framepile(stateData.currentlanguage);
  },

  async showError (message, description, detail) {
    await this.destroyView();
    atom.notifications.addError(message, {
      dismissable: true,
      ...description && {description},
      ...detail && {detail}
    });
  },

  addSaveEvent (editor) {
    const saveEnabledOn = atom.config.get('frame-machine-maker.saveEnabledOn');
    if (saveEnabledOn.indexOf(editor.id) === -1) {
      saveEnabledOn.push(editor.id);
      atom.config.set('frame-machine-maker.saveEnabledOn', saveEnabledOn);
      editor.onDidSave((event) => {
        if (view.isOpened) {
          this.framepile(stateData.currentlanguage);
        }
      })
      editor.onDidDestroy((event) => {
        this.removeSaveEvent(editor.id);
      })
    }
  },

  restoreSaveEvent () {
    const saveEnabledOn = atom.config.get('frame-machine-maker.saveEnabledOn');
    atom.workspace.getTextEditors().forEach((editor) => {
      if (saveEnabledOn.indexOf(editor.id) >= 0) {
        editor.onDidSave((event) => {
          if (view.isOpened) {
            this.framepile(stateData.currentlanguage);
          }
        })
        editor.onDidDestroy((event) => {
          this.removeSaveEvent(editor.id);
        })
      }
    });
  },

  removeSaveEvent (editorId) {
    const saveEnabledOn = atom.config.get('frame-machine-maker.saveEnabledOn');
    const removeIndex = saveEnabledOn.indexOf(editorId);
    saveEnabledOn.splice(removeIndex, 1);
    atom.config.set('frame-machine-maker.saveEnabledOn', saveEnabledOn);
  },

  deactivate() {
    this.subscriptions.dispose();
  }
};
