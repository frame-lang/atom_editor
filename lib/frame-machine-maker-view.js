'use babel';

import { CompositeDisposable } from 'atom';
const CodeMirror = require('../media/js/codemirror');
import $ from 'jQuery';
import { normalize } from 'path';
import { saveFramepiledFile } from './commonFunc';

export default class FrameMachineMakerView {
  maxVW = 90;
  maxVH = 90;
  step = 50;
  constructor({editorData, plantUmlUrl, currentlanguage, frameSpecLocation}) {
    this.editorData = editorData;
    this.plantUmlUrl = plantUmlUrl;
    this.currentlanguage = currentlanguage;
    this.frameSpecLocation = frameSpecLocation;
    this.element = document.createElement('div');
    this.element.classList.add('frame-machine-maker');

    // Register Zoom-in and Zoom-out command in Atom workspace which will call the functions only if target is UML 
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'frame-machine-maker:zoom-in': () => {
          if (this.currentlanguage !== 'plantuml') return;
          this.zoom(1);
        },
        'frame-machine-maker:zoom-out': () => {
          if (this.currentlanguage !== 'plantuml') return;
          this.zoom(-1);
        }
      })
    )

    // For empty Frame file show a webpage instead
    if (!this.editorData) {
      this.element.innerHTML = '<object data="https://frame-lang.org/frame-machine-maker-atom.html"/>'
      return;
    }

    // If we have UML target, show image with the help of given URL
    if (this.currentlanguage === 'plantuml') {
      if (!this.plantUmlUrl) { // If we have UML target, but URL is empty show nothing
        return;
      }
      this.getUMLView();
      return;
    }
    // Generate a Code Mirror instance to show code which is read only
    const targetEditor = CodeMirror(this.element, {
      lineNumbers: true,
      value: '',
      mode:  'text',
      readOnly: true
    });
    targetEditor.setValue(this.editorData);
    setTimeout(function() {
      targetEditor.refresh();
    },100);
    this.getCodeMirrorView(targetEditor);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'frame-machine-maker/FrameMachineMakerView',
      editorData: this.editorData,
      plantUmlUrl: this.plantUmlUrl,
      currentlanguage: this.currentlanguage
    };
  }

  getUMLView = () => {
    this.element.style.overflow = 'auto';
    // Add font awesome
    const fontAwesomePath = normalize(`${__dirname}/../media/css/font-awesome.min.css`);
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = fontAwesomePath;
    this.element.appendChild(fontAwesome);

    const widthDiv = document.createElement('span');
    widthDiv.className = 'width';
    widthDiv.innerHTML = 0;
    this.element.appendChild(widthDiv);

    const XInDimention = document.createElement('span');
    XInDimention.innerHTML = 'X';
    this.element.appendChild(XInDimention);

    const heightDiv = document.createElement('span');
    heightDiv.className = 'height';
    heightDiv.innerHTML = 0;
    this.element.appendChild(heightDiv);

    // Add image in div
    const imgDiv = document.createElement('div');
    imgDiv.className = 'copyable';
    const img = document.createElement('img');
    img.src = this.plantUmlUrl;
    img.id = 'plantUmlImg';
    img.onload = () => {
      this.imageLoadHandler(img);
    }
    img.ondblclick = () => {
      this.resetImage();
    };
  
    imgDiv.appendChild(img);
    this.element.appendChild(imgDiv);

    // Add copy button and onclick functionality
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.onclick = () => {
      this.copyImageToCipboard();
    };
    Object.assign(copyButton.style, {
      'margin-top': '40px',
      'margin-right': '60px',
      'position': 'fixed',
      'top': 0,
      'right': 0,
      'z-index': 999
    });

    // Add font awesome icon in button tag
    const iTag = document.createElement('i');
    iTag.className = 'fas fa-copy';
    copyButton.appendChild(iTag);
    this.element.appendChild(copyButton);

    // Save button
    const saveButton = this.addSaveButton();
    this.element.appendChild(saveButton);

    // Resize buttons
    const zoomButtons = document.createElement('div');
    zoomButtons.className = 'zoom-buttons';
    Object.assign(zoomButtons.style, {
      'margin-bottom': '60px',
      'margin-right': '20%',
      'position': 'fixed',
      'bottom': 0,
      'right': 0,
      'z-index': 999
    });

    const zoomInButton = document.createElement('button');
    zoomInButton.type = 'button';
    zoomInButton.onclick = () => {
      this.zoom(1);
    };
    const zoomInIcon = document.createElement('i');
    zoomInIcon.className = 'fas fa-search-plus';
    zoomInButton.appendChild(zoomInIcon);
    zoomButtons.appendChild(zoomInButton);

    const zoomOutButton = document.createElement('button');
    zoomOutButton.type = 'button';
    zoomOutButton.onclick = () => {
      this.zoom(-1);
    };
    const zoomOutIcon = document.createElement('i');
    zoomOutIcon.className = 'fas fa-search-minus';
    zoomOutButton.appendChild(zoomOutIcon);
    zoomButtons.appendChild(zoomOutButton);
    this.element.appendChild(zoomButtons);
  }

  copyImageToCipboard = async () => {
    const res = await fetch(this.plantUmlUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
  }

  addSaveButton = () => {
    // Add save button and onclick functionality
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.onclick = () => {
      saveFramepiledFile(this.frameSpecLocation, {
        'editorData': this.editorData,
        'plantUmlUrl': this.plantUmlUrl,
        'currentlanguage': this.currentlanguage
      });
    };
    Object.assign(saveButton.style, {
      'margin-top': '40px',
      'margin-right': '20px',
      'position': 'fixed',
      'top': 0,
      'right': 0,
      'z-index': 999
    });

    // Add font awesome icon in button tag
    const iTag2 = document.createElement('i');
    iTag2.className = 'fas fa-save';
    saveButton.appendChild(iTag2);
    return saveButton;
  }

  getCodeMirrorView = (codeMirror) => {
    // Add font awesome
    const fontAwesomePath = normalize(`${__dirname}/../media/css/font-awesome.min.css`);
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = fontAwesomePath;
    this.element.appendChild(fontAwesome);

    // Add ClipboardJS
    const clipboardJSPath = normalize(`${__dirname}/../media/js/clipboard.min.js`);
    const clipboardJS = document.createElement('script');
    clipboardJS.setAttribute('src', clipboardJSPath);
    this.element.appendChild(clipboardJS);

    // Add copy button and onclick functionality
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'copy-output';
    Object.assign(copyButton.style, {
      'margin-top': '40px',
      'margin-right': '60px',
      'position': 'fixed',
      'top': 0,
      'right': 0,
      'z-index': 999
    });

    // Add font awesome icon in button tag
    const iTag = document.createElement('i');
    iTag.className = 'fas fa-copy';
    copyButton.appendChild(iTag);
    this.element.appendChild(copyButton);

    // Add clipboard functionality on button with copy-output class
    clipboardJS.onload = () => {
      new Clipboard('.copy-output', {
        text: (trigger) => codeMirror.getValue()
      });
    }

    // Save button
    const saveButton = this.addSaveButton();
    this.element.appendChild(saveButton);
  }

  // Tear down any state and detach
  destroy() {
    this.element.remove();
    this.subscriptions.dispose();
  }

  getElement() {
    return this.element;
  };

  getTitle = () => this.editorData ? `Frame Machine Maker (${this.currentlanguage})` : 'Frame Machine Maker';

  getURI = () => `frame-machine-maker://editor`;

  // Resize image functionality starts
  imageLoadHandler = () => {
    this.resetImage();
    this.updateDimensions();
  };

  zoom = (inc) => {
    const plantUmlImg = $('#plantUmlImg');
    const height = plantUmlImg.height() + inc * this.step;
    const width = plantUmlImg.width() + inc * this.step;
    const vh = this.convertPXToVH(height);
    const vw = this.convertPXToVW(width);
    if (height <= 0 || width <= 0) {
      return;
    }
    if (vh > this.maxVH) {
      plantUmlImg.css("max-height", "");
    }
    if (vw > this.maxVW) {
      plantUmlImg.css("max-width", "");
    }
  
    plantUmlImg.css({ width: `${width}px`, height: `${height}px` });
    this.updateDimensions();
  };

  resetImage = () => {
    const plantUmlImg = $('#plantUmlImg');
    plantUmlImg.removeAttr("style");
    plantUmlImg.css({ maxWidth: `${this.maxVW}vw`, maxHeight: `${this.maxVH}vh` });
  };

  updateDimensions = () => {
    const plantUmlImg = $('#plantUmlImg');
    $(".width").html(parseInt(plantUmlImg.width()));
    $(".height").html(parseInt(plantUmlImg.height()));
  };

  keydown = (evt) => {
    console.log('keydown', evt);
    if (!evt) evt = event;
    if (evt.altKey && (evt.keyCode === 187 || evt.keyCode === 107)) {
      zoom(1);
    } else if (evt.altKey && (evt.keyCode === 189 || evt.keyCode === 109)) {
      zoom(-1);
    }
  }

  convertPXToVW = (px) => px * (100 / document.documentElement.clientWidth);

  convertPXToVH = (px) => px * (100 / document.documentElement.clientHeight);
  // Resize image functionality ends
}



